from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from apps.core.authentication import APIKeyAuthentication
from rest_framework.permissions import IsAuthenticated
from apps.customers.models import Customer
from apps.transactions.models import Transaction
from apps.actions.models import Action
from apps.agents.models import AgentExecution
from django.db.models import Q
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_fraud_alerts(request):
    """
    Get fraud alerts based on high-risk transactions and customer flags.
    """
    try:
        # Get high-risk transactions (amount > 5000 or suspicious patterns)
        high_risk_transactions = Transaction.objects.filter(
            Q(amount__gt=5000) | Q(merchant__icontains='ATM')
        ).order_by('-timestamp')[:20]
        
        alerts = []
        for txn in high_risk_transactions:
            # Check if customer has risk flags
            customer_risk_flags = txn.customer.risk_flags if hasattr(txn.customer, 'risk_flags') else []
            
            # Calculate risk score based on amount and customer flags
            risk_score = min(100, (txn.amount / 1000) * 10 + len(customer_risk_flags) * 20)
            
            # Determine risk level
            if risk_score >= 70:
                risk_level = 'high'
            elif risk_score >= 40:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            # Determine status and action based on transaction status and agent executions
            action_taken = None
            
            # First, check if there's an agent execution for this transaction
            agent_execution = AgentExecution.objects.filter(
                transaction=txn,
                status='COMPLETED'
            ).first()
            
            if agent_execution and agent_execution.result:
                # Get the actual action from the agent execution result
                final_result = agent_execution.result.get('final_result', {})
                action_taken = final_result.get('action')
                
                # Determine status based on action
                if action_taken in ['FREEZE_CARD', 'OPEN_DISPUTE', 'ESCALATE_CASE', 'EXPLAIN_ONLY']:
                    status = 'resolved'
                elif action_taken == 'CONTACT_CUSTOMER':
                    status = 'in_progress'
                else:
                    status = 'resolved'
            else:
                # Fallback to transaction status if no agent execution
                if txn.status in ['FROZEN', 'DISPUTED', 'ESCALATED', 'COMPLETED']:
                    status = 'resolved'
                    # Map transaction status to action
                    if txn.status == 'FROZEN':
                        action_taken = 'FREEZE_CARD'
                    elif txn.status == 'DISPUTED':
                        action_taken = 'OPEN_DISPUTE'
                    elif txn.status == 'ESCALATED':
                        action_taken = 'ESCALATE_CASE'
                    elif txn.status == 'COMPLETED':
                        action_taken = 'EXPLAIN_ONLY'
                elif txn.status in ['UNDER_REVIEW']:
                    status = 'in_progress'
                    action_taken = 'CONTACT_CUSTOMER'
                else:
                    # Check if there are any recent actions for this transaction
                    recent_actions = Action.objects.filter(
                        customer=txn.customer,
                        created_at__gte=txn.timestamp
                    ).exists()
                    status = 'resolved' if recent_actions else 'pending'
            
            alert = {
                'id': f'alert_{txn.id}',
                'customerId': txn.customer.id,
                'customerName': txn.customer.name,
                'transactionId': txn.id,
                'cardId': txn.card.id if txn.card else None,
                'merchant': txn.merchant,
                'amount': float(txn.amount),
                'riskScore': int(risk_score),
                'riskLevel': risk_level,
                'status': status,
                'actionTaken': action_taken,
                'createdAt': txn.timestamp.isoformat(),
                'reasons': customer_risk_flags + (['high_amount'] if txn.amount > 5000 else [])
            }
            alerts.append(alert)
        
        return Response(alerts)
        
    except Exception as e:
        logger.error(f"Error in get_fraud_alerts: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
