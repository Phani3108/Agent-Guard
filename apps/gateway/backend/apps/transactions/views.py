from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.db import transaction
from django.core.cache import cache
import json
import uuid
import logging
from datetime import datetime
from .models import Transaction
from apps.customers.models import Customer, Card, Device
from apps.observability.models import AuditLog
from apps.core.authentication import APIKeyAuthentication

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def ingest_transactions(request):
    """
    Ingest transactions from CSV/JSON data.
    Supports idempotency via Idempotency-Key header.
    """
    request_id = str(uuid.uuid4())
    session_id = request.META.get('HTTP_SESSION_ID', 'unknown')
    
    # Check idempotency
    idempotency_key = request.META.get('HTTP_IDEMPOTENCY_KEY')
    if idempotency_key:
        cache_key = f"ingest:{idempotency_key}"
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.info(f"Returning cached result for idempotency key {idempotency_key}")
            return Response(cached_result)
    
    try:
        # Parse request data
        if request.content_type == 'application/json':
            data = request.data
            transactions_data = data.get('transactions', [])
        elif 'multipart/form-data' in request.content_type:
            # Handle CSV file upload
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'No file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            file = request.FILES['file']
            if not file.name.endswith('.csv'):
                return Response(
                    {'error': 'Only CSV files are supported'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse CSV file
            import csv
            import io
            
            # Read CSV content
            csv_content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            
            transactions_data = []
            for row in csv_reader:
                # Convert CSV row to transaction data
                transaction_data = {
                    'id': row.get('id', f"txn_{uuid.uuid4().hex[:8]}"),
                    'customerId': row.get('customerId'),
                    'cardId': row.get('cardId'),
                    'deviceId': row.get('deviceId'),
                    'mcc': row.get('mcc', '5999'),
                    'merchant': row.get('merchant', 'Unknown'),
                    'amount': float(row.get('amount', 0)),
                    'currency': row.get('currency', 'INR'),
                    'timestamp': row.get('ts', datetime.now().isoformat()),
                    'geo': {
                        'lat': float(row.get('geo_lat', 0)),
                        'lon': float(row.get('geo_lon', 0)),
                        'country': row.get('geo_country', 'IN')
                    }
                }
                transactions_data.append(transaction_data)
        else:
            return Response(
                {'error': 'Unsupported content type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not transactions_data:
            return Response(
                {'error': 'No transactions provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process transactions
        processed_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            for txn_data in transactions_data:
                try:
                    # Check if transaction already exists
                    existing_txn = Transaction.objects.filter(
                        customer_id=txn_data['customerId'],
                        id=txn_data['id']
                    ).first()
                    
                    if existing_txn:
                        skipped_count += 1
                        continue
                    
                    # Get or create customer
                    customer, _ = Customer.objects.get_or_create(
                        id=txn_data['customerId'],
                        defaults={
                            'name': f"Customer {txn_data['customerId']}",
                            'email_masked': f"c***@{txn_data['customerId'][:3]}***.com",
                            'risk_flags': []
                        }
                    )
                    
                    # Get or create card
                    card, _ = Card.objects.get_or_create(
                        id=txn_data['cardId'],
                        defaults={
                            'customer': customer,
                            'last4': txn_data.get('last4', '0000'),
                            'status': 'ACTIVE',
                            'network': 'VISA'
                        }
                    )
                    
                    # Get device if provided
                    device = None
                    if txn_data.get('deviceId'):
                        device, _ = Device.objects.get_or_create(
                            id=txn_data['deviceId'],
                            defaults={
                                'customer': customer,
                                'device_type': 'mobile',
                                'device_fingerprint': f"fp_{txn_data['deviceId']}",
                                'is_trusted': False
                            }
                        )
                    
                    # Create transaction
                    txn = Transaction.objects.create(
                        id=txn_data['id'],
                        customer=customer,
                        card=card,
                        mcc=txn_data['mcc'],
                        merchant=txn_data['merchant'],
                        amount=txn_data['amount'],
                        currency=txn_data.get('currency', 'INR'),
                        timestamp=datetime.fromisoformat(txn_data['timestamp'].replace('Z', '+00:00')),
                        device=device,
                        geo_lat=txn_data.get('geo', {}).get('lat'),
                        geo_lon=txn_data.get('geo', {}).get('lon'),
                        geo_country=txn_data.get('geo', {}).get('country', 'IN')
                    )
                    
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Error processing transaction {txn_data.get('id', 'unknown')}: {str(e)}")
                    continue
        
        result = {
            'accepted': True,
            'count': processed_count,
            'skipped': skipped_count,
            'requestId': request_id
        }
        
        # Cache result for idempotency
        if idempotency_key:
            cache.set(cache_key, result, timeout=3600)  # 1 hour
        
        # Log audit event
        AuditLog.objects.create(
            event_type='ACTION_CREATED',
            user_id=request.user.role if hasattr(request.user, 'role') else 'unknown',
            request_id=request_id,
            session_id=session_id,
            details={
                'action': 'ingest_transactions',
                'processed_count': processed_count,
                'skipped_count': skipped_count
            }
        )
        
        logger.info(f"Successfully ingested {processed_count} transactions, skipped {skipped_count}")
        
        return Response(result, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error in ingest_transactions: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_customer_transactions(request, customer_id):
    """
    Get paginated transactions for a customer.
    Supports date filtering and pagination.
    """
    try:
        # Get query parameters
        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        page = int(request.GET.get('page', 1))
        size = int(request.GET.get('size', 50))
        
        # Validate pagination
        if size > 1000:
            size = 1000
        if page < 1:
            page = 1
        
        # Build query
        queryset = Transaction.objects.filter(customer_id=customer_id)
        
        # Apply date filters
        if from_date:
            from datetime import datetime
            from_date_obj = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            queryset = queryset.filter(timestamp__gte=from_date_obj)
        
        if to_date:
            from datetime import datetime
            to_date_obj = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            queryset = queryset.filter(timestamp__lte=to_date_obj)
        
        # Order by timestamp descending
        queryset = queryset.order_by('-timestamp')
        
        # Calculate pagination
        total_count = queryset.count()
        start_index = (page - 1) * size
        end_index = start_index + size
        
        transactions = queryset[start_index:end_index]
        
        # Serialize transactions
        transaction_data = []
        for txn in transactions:
            transaction_data.append({
                'id': txn.id,
                'customerId': txn.customer_id,
                'cardId': txn.card_id,
                'mcc': txn.mcc,
                'merchant': txn.merchant,
                'amount': txn.amount,
                'currency': txn.currency,
                'timestamp': txn.timestamp.isoformat() + 'Z',
                'deviceId': txn.device_id,
                'geo': {
                    'lat': float(txn.geo_lat) if txn.geo_lat else None,
                    'lon': float(txn.geo_lon) if txn.geo_lon else None,
                    'country': txn.geo_country
                },
                'status': txn.status
            })
        
        return Response({
            'transactions': transaction_data,
            'pagination': {
                'page': page,
                'size': size,
                'total': total_count,
                'hasNext': end_index < total_count,
                'hasPrev': page > 1
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_customer_transactions: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )