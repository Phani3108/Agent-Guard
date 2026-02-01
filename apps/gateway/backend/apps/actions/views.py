from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import uuid
import logging
from datetime import datetime
from .models import Action, Dispute
from apps.customers.models import Card
from apps.transactions.models import Transaction
from apps.observability.models import AuditLog
from apps.core.authentication import APIKeyAuthentication

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def freeze_card(request):
    """
    Freeze a card with optional OTP verification.
    """
    try:
        card_id = request.data.get('cardId')
        otp = request.data.get('otp')
        
        if not card_id:
            return Response(
                {'error': 'cardId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check idempotency
        idempotency_key = request.META.get('HTTP_IDEMPOTENCY_KEY')
        if idempotency_key:
            cache_key = f"freeze_card:{idempotency_key}"
            cached_result = cache.get(cache_key)
            if cached_result:
                return Response(cached_result)
        
        # Get card
        try:
            card = Card.objects.get(id=card_id)
        except Card.DoesNotExist:
            return Response(
                {'error': 'Card not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already frozen
        if card.status == 'FROZEN':
            return Response({
                'status': 'FROZEN',
                'message': 'Card is already frozen'
            })
        
        # Check OTP requirement
        user_role = getattr(request.user, 'role', 'agent')
        otp_required = user_role == 'agent'  # Leads can bypass OTP
        
        if otp_required and not otp:
            # Create pending action
            action = Action.objects.create(
                customer=card.customer,
                card=card,
                action_type='FREEZE_CARD',
                status='PENDING_OTP',
                otp_required=True,
                created_by=user_role
            )
            
            result = {
                'status': 'PENDING_OTP',
                'message': 'OTP required to freeze card',
                'actionId': action.id
            }
            
            # Cache result for idempotency
            if idempotency_key:
                cache.set(cache_key, result, timeout=3600)
            
            return Response(result)
        
        # Verify OTP if provided
        if otp_required and otp:
            if not verify_otp(otp):
                return Response(
                    {'error': 'Invalid OTP'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Freeze the card
        card.status = 'FROZEN'
        card.save()
        
        # Create completed action
        action = Action.objects.create(
            customer=card.customer,
            card=card,
            action_type='FREEZE_CARD',
            status='COMPLETED',
            otp_required=otp_required,
            otp_provided=otp if otp else None,
            otp_verified=bool(otp),
            created_by=user_role,
            completed_at=datetime.now()
        )
        
        # Update related transactions status
        Transaction.objects.filter(card=card, status='COMPLETED').update(status='FROZEN')
        
        result = {
            'status': 'FROZEN',
            'message': 'Card has been frozen successfully',
            'actionId': action.id
        }
        
        # Cache result for idempotency
        if idempotency_key:
            cache.set(cache_key, result, timeout=3600)
        
        # Log audit event
        AuditLog.objects.create(
            event_type='ACTION_COMPLETED',
            user_id=user_role,
            customer_id=card.customer.id,
            details={
                'action': 'freeze_card',
                'card_id': card_id,
                'otp_verified': bool(otp)
            }
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Error in freeze_card: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def open_dispute(request):
    """
    Open a dispute for a transaction.
    """
    try:
        txn_id = request.data.get('txnId')
        reason_code = request.data.get('reasonCode', '10.4')
        confirm = request.data.get('confirm', False)
        
        if not txn_id:
            return Response(
                {'error': 'txnId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not confirm:
            return Response(
                {'error': 'Confirmation required to open dispute'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get transaction
        try:
            transaction = Transaction.objects.get(id=txn_id)
        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create action
        action = Action.objects.create(
            customer=transaction.customer,
            transaction=transaction,
            action_type='OPEN_DISPUTE',
            status='COMPLETED',
            parameters={
                'reason_code': reason_code,
                'amount': transaction.amount
            },
            created_by=getattr(request.user, 'role', 'agent'),
            completed_at=datetime.now()
        )
        
        # Update transaction status
        transaction.status = 'DISPUTED'
        transaction.save()
        
        # Create dispute
        case_id = f"case_{uuid.uuid4().hex[:8]}"
        dispute = Dispute.objects.create(
            action=action,
            case_id=case_id,
            reason_code=reason_code,
            amount=abs(transaction.amount),
            status='OPEN'
        )
        
        result = {
            'caseId': case_id,
            'status': 'OPEN',
            'message': 'Dispute has been opened successfully',
            'actionId': action.id,
            'disputeId': dispute.id
        }
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Error in open_dispute: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def contact_customer(request):
    """
    Create a contact customer action.
    """
    try:
        customer_id = request.data.get('customerId')
        message = request.data.get('message', '')
        contact_type = request.data.get('contactType', 'call')
        
        if not customer_id:
            return Response(
                {'error': 'customerId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create action
        action = Action.objects.create(
            customer_id=customer_id,
            action_type='CONTACT_CUSTOMER',
            status='COMPLETED',
            parameters={
                'message': message,
                'contact_type': contact_type
            },
            created_by=getattr(request.user, 'role', 'agent'),
            completed_at=datetime.now()
        )
        
        result = {
            'status': 'COMPLETED',
            'message': 'Customer contact action created',
            'actionId': action.id
        }
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Error in contact_customer: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def unfreeze_card(request):
    """
    Unfreeze a card.
    """
    try:
        card_id = request.data.get('cardId')
        
        if not card_id:
            return Response(
                {'error': 'cardId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get card
        try:
            card = Card.objects.get(id=card_id)
        except Card.DoesNotExist:
            return Response(
                {'error': 'Card not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already unfrozen
        if card.status != 'FROZEN':
            return Response({
                'status': 'ACTIVE',
                'message': 'Card is not frozen'
            })
        
        # Unfreeze the card
        card.status = 'ACTIVE'
        card.save()
        
        # Create completed action
        action = Action.objects.create(
            customer=card.customer,
            card=card,
            action_type='UNFREEZE_CARD',
            status='COMPLETED',
            created_by=getattr(request.user, 'role', 'agent'),
            completed_at=datetime.now()
        )
        
        result = {
            'status': 'ACTIVE',
            'message': 'Card has been unfrozen successfully',
            'actionId': action.id
        }
        
        # Log audit event
        AuditLog.objects.create(
            event_type='ACTION_COMPLETED',
            user_id=getattr(request.user, 'role', 'agent'),
            customer_id=card.customer.id,
            details={
                'action': 'unfreeze_card',
                'card_id': card_id
            }
        )
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Error in unfreeze_card: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def verify_otp(otp: str) -> bool:
    """
    Verify OTP (mock implementation).
    In production, this would integrate with SMS/email service.
    """
    # For testing, accept '123456' as valid OTP
    return otp == '123456'