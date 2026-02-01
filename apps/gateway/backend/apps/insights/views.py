from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth, TruncDay
from django.core.cache import cache
import logging
from datetime import datetime, timedelta
from .models import InsightReport, SpendCategory
from apps.transactions.models import Transaction
from apps.customers.models import Customer
from apps.core.authentication import APIKeyAuthentication

logger = logging.getLogger(__name__)


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_customer_insights(request, customer_id):
    """
    Get spend insights and summary for a customer.
    """
    try:
        # Check cache first
        cache_key = f"insights:{customer_id}"
        cached_insights = cache.get(cache_key)
        if cached_insights:
            return Response(cached_insights)
        
        # Get customer
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get last 90 days of transactions
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        transactions = Transaction.objects.filter(
            customer=customer,
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).order_by('-timestamp')
        
        # Calculate top merchants
        top_merchants = transactions.values('merchant').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('-total_amount')[:10]
        
        # Calculate spend categories
        spend_categories = transactions.values('mcc').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('-total_amount')
        
        # Add category names
        category_data = []
        for category in spend_categories:
            try:
                spend_cat = SpendCategory.objects.get(mcc=category['mcc'])
                category_name = spend_cat.category_name
            except SpendCategory.DoesNotExist:
                category_name = f"MCC {category['mcc']}"
            
            category_data.append({
                'mcc': category['mcc'],
                'category_name': category_name,
                'total_amount': abs(category['total_amount']),
                'transaction_count': category['transaction_count']
            })
        
        # Calculate monthly trends
        monthly_trends = transactions.annotate(
            month=TruncMonth('timestamp')
        ).values('month').annotate(
            total_amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('month')
        
        monthly_data = []
        for month_data in monthly_trends:
            monthly_data.append({
                'month': month_data['month'].strftime('%Y-%m'),
                'total_amount': abs(month_data['total_amount']),
                'transaction_count': month_data['transaction_count']
            })
        
        # Calculate summary statistics
        total_spend = abs(transactions.aggregate(total=Sum('amount'))['total'] or 0)
        avg_transaction = abs(transactions.aggregate(avg=Avg('amount'))['avg'] or 0)
        total_transactions = transactions.count()
        
        # Calculate risk indicators
        high_amount_transactions = transactions.filter(amount__lt=-100000).count()  # >1000 INR
        unusual_mcc_count = transactions.values('mcc').distinct().count()
        
        insights = {
            'customerId': customer_id,
            'summary': {
                'totalSpend': total_spend,
                'totalTransactions': total_transactions,
                'avgTransactionAmount': round(avg_transaction, 2),
                'highAmountTransactions': high_amount_transactions,
                'uniqueMerchants': unusual_mcc_count
            },
            'topMerchants': [
                {
                    'merchant': merchant['merchant'],
                    'totalAmount': abs(merchant['total_amount']),
                    'transactionCount': merchant['transaction_count']
                }
                for merchant in top_merchants
            ],
            'categories': category_data[:10],  # Top 10 categories
            'monthlyTrend': monthly_data,
            'generatedAt': datetime.now().isoformat() + 'Z'
        }
        
        # Cache for 1 hour
        cache.set(cache_key, insights, timeout=3600)
        
        # Save to database
        InsightReport.objects.create(
            customer=customer,
            report_type='spend_summary',
            data=insights
        )
        
        return Response(insights)
        
    except Exception as e:
        logger.error(f"Error in get_customer_insights: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_spend_categories(request):
    """
    Get all available spend categories with MCC codes.
    """
    try:
        categories = SpendCategory.objects.all().values('mcc', 'category_name')
        return Response(list(categories))
    except Exception as e:
        logger.error(f"Error in get_spend_categories: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def generate_insight_report(request):
    """
    Generate a comprehensive insight report for a customer.
    """
    try:
        customer_id = request.data.get('customerId')
        if not customer_id:
            return Response(
                {'error': 'customerId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use the existing get_customer_insights function
        return get_customer_insights(request, customer_id)
        
    except Exception as e:
        logger.error(f"Error in generate_insight_report: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )