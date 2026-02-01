"""
Agent Tools for Fraud Triage
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from django.core.cache import cache

from apps.customers.models import Customer, Card, Device
from apps.transactions.models import Transaction, Chargeback
from apps.insights.models import KnowledgeBaseDocument
from .redactor import PIIRedactor
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class BaseTool:
    """Base class for all agent tools."""
    
    def __init__(self):
        self.redactor = PIIRedactor()
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool with given context."""
        raise NotImplementedError


class GetProfileTool(BaseTool):
    """Get customer profile information."""
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        customer_id = context['customer_id']
        
        try:
            customer = await sync_to_async(Customer.objects.get)(id=customer_id)
            cards = await sync_to_async(list)(Card.objects.filter(customer=customer))
            devices = await sync_to_async(list)(Device.objects.filter(customer=customer))
            
            # Get recent chargebacks
            recent_chargebacks = await sync_to_async(Chargeback.objects.filter(
                customer=customer,
                created_at__gte=datetime.now() - timedelta(days=365)
            ).count)()
            
            profile = {
                'customer_id': customer.id,
                'name': customer.name,
                'email_masked': customer.email_masked,
                'risk_flags': customer.risk_flags,
                'cards': [
                    {
                        'id': card.id,
                        'last4': card.last4,
                        'status': card.status,
                        'network': card.network
                    }
                    for card in cards
                ],
                'devices': [
                    {
                        'id': device.id,
                        'device_type': device.device_type,
                        'is_trusted': device.is_trusted,
                        'last_seen': device.last_seen.isoformat()
                    }
                    for device in devices
                ],
                'recent_chargebacks': recent_chargebacks
            }
            
            return {'profile': profile}
            
        except Customer.DoesNotExist:
            return {'error': 'Customer not found'}
        except Exception as e:
            logger.error(f"Error in GetProfileTool: {str(e)}")
            return {'error': str(e)}


class GetRecentTransactionsTool(BaseTool):
    """Get recent transactions for analysis."""
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        customer_id = context['customer_id']
        suspect_txn_id = context.get('suspect_txn_id')
        
        try:
            # Get last 30 days of transactions
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            transactions = await sync_to_async(list)(Transaction.objects.filter(
                customer_id=customer_id,
                timestamp__gte=start_date,
                timestamp__lte=end_date
            ).order_by('-timestamp')[:50])  # Limit to 50 most recent
            
            # Get suspect transaction if provided
            suspect_transaction = None
            if suspect_txn_id:
                try:
                    suspect_transaction = await sync_to_async(Transaction.objects.get)(
                        id=suspect_txn_id,
                        customer_id=customer_id
                    )
                except Transaction.DoesNotExist:
                    pass
            
            transaction_data = []
            for txn in transactions:
                transaction_data.append({
                    'id': txn.id,
                    'merchant': txn.merchant,
                    'amount': txn.amount,
                    'mcc': txn.mcc,
                    'timestamp': txn.timestamp.isoformat(),
                    'device_id': txn.device_id,
                    'geo_country': txn.geo_country
                })
            
            result = {
                'recent_transactions': transaction_data,
                'transaction_count': len(transaction_data)
            }
            
            if suspect_transaction:
                result['suspect_transaction'] = {
                    'id': suspect_transaction.id,
                    'merchant': suspect_transaction.merchant,
                    'amount': suspect_transaction.amount,
                    'mcc': suspect_transaction.mcc,
                    'timestamp': suspect_transaction.timestamp.isoformat(),
                    'device_id': suspect_transaction.device_id,
                    'geo_country': suspect_transaction.geo_country
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in GetRecentTransactionsTool: {str(e)}")
            return {'error': str(e)}


class RiskSignalsTool(BaseTool):
    """Analyze risk signals for fraud detection."""
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # Get data from previous tool results
        profile_result = context.get('getProfile_result', {})
        recent_txns_result = context.get('getRecentTransactions_result', {})
        
        profile = profile_result.get('profile', {})
        recent_transactions = recent_txns_result.get('recent_transactions', [])
        suspect_transaction = recent_txns_result.get('suspect_transaction')
        
        risk_signals = []
        risk_score = 0
        
        try:
            # Check user message for specific scenarios
            user_message = context.get('user_message', '').lower()
            
            # Card lost scenario
            if 'lost' in user_message or 'stolen' in user_message:
                risk_signals.append({
                    'signal': 'card_lost',
                    'description': 'Customer reports lost/stolen card',
                    'risk_level': 'high'
                })
                risk_score += 40
            
            # Unauthorized transaction scenario
            if 'unauthorized' in user_message or 'dispute' in user_message or "don't recognize" in user_message:
                risk_signals.append({
                    'signal': 'unauthorized_transaction',
                    'description': 'Customer reports unauthorized transaction',
                    'risk_level': 'high'
                })
                risk_score += 35
            
            # Duplicate transaction scenario
            if 'duplicate' in user_message or 'charged twice' in user_message:
                risk_signals.append({
                    'signal': 'duplicate_transaction',
                    'description': 'Customer reports duplicate charge',
                    'risk_level': 'low'
                })
                risk_score += 5
            
            # Analyze velocity (high frequency transactions)
            if len(recent_transactions) > 20:
                risk_signals.append({
                    'signal': 'high_velocity',
                    'description': 'High transaction frequency',
                    'risk_level': 'medium'
                })
                risk_score += 20
            
            # Analyze amount patterns
            if suspect_transaction:
                amount = abs(suspect_transaction['amount'])
                if amount > 50000:  # >500 INR - more sensitive threshold
                    risk_signals.append({
                        'signal': 'high_amount',
                        'description': f'High amount transaction: ₹{amount/100:.2f}',
                        'risk_level': 'high' if amount > 100000 else 'medium'
                    })
                    risk_score += 25 if amount > 100000 else 15
            
            # Analyze device changes
            if suspect_transaction and suspect_transaction.get('device_id'):
                device_id = suspect_transaction['device_id']
                # Check if this device is trusted
                devices = profile.get('devices', [])
                device_trusted = any(
                    device['id'] == device_id and device['is_trusted'] 
                    for device in devices
                )
                
                if not device_trusted:
                    risk_signals.append({
                        'signal': 'device_change',
                        'description': 'Transaction from untrusted device',
                        'risk_level': 'high'
                    })
                    risk_score += 25
            
            # Analyze geographic anomalies
            if suspect_transaction and recent_transactions:
                suspect_country = suspect_transaction.get('geo_country')
                recent_countries = [txn.get('geo_country') for txn in recent_transactions[:5]]
                
                if suspect_country not in recent_countries:
                    risk_signals.append({
                        'signal': 'geo_anomaly',
                        'description': f'Transaction from new country: {suspect_country}',
                        'risk_level': 'medium'
                    })
                    risk_score += 20
            
            # Analyze MCC patterns
            if suspect_transaction:
                suspect_mcc = suspect_transaction.get('mcc')
                recent_mccs = [txn.get('mcc') for txn in recent_transactions[:10]]
                
                if suspect_mcc not in recent_mccs:
                    risk_signals.append({
                        'signal': 'mcc_anomaly',
                        'description': f'Unusual merchant category: {suspect_mcc}',
                        'risk_level': 'low'
                    })
                    risk_score += 10
            
            # Analyze chargeback history
            recent_chargebacks = profile.get('recent_chargebacks', 0)
            if recent_chargebacks > 2:
                risk_signals.append({
                    'signal': 'chargeback_history',
                    'description': f'Multiple recent chargebacks: {recent_chargebacks}',
                    'risk_level': 'high'
                })
                risk_score += 30
            
            # Determine overall risk level
            if risk_score >= 70:
                risk_level = 'high'
            elif risk_score >= 40:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            return {
                'risk_signals': risk_signals,
                'risk_score': risk_score,
                'risk_level': risk_level
            }
            
        except Exception as e:
            logger.error(f"Error in RiskSignalsTool: {str(e)}")
            return {'error': str(e)}


class KBLookupTool(BaseTool):
    """Search knowledge base for relevant information."""
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        user_message = context.get('user_message', '')
        risk_signals = context.get('risk_signals', [])
        
        try:
            # Determine search terms based on context
            search_terms = []
            
            # Add terms from user message
            if 'dispute' in user_message.lower():
                search_terms.append('dispute')
            if 'freeze' in user_message.lower():
                search_terms.append('freeze')
            if 'travel' in user_message.lower():
                search_terms.append('travel')
            
            # Add terms from risk signals
            for signal in risk_signals:
                if signal['signal'] == 'chargeback_history':
                    search_terms.append('chargeback')
                elif signal['signal'] == 'device_change':
                    search_terms.append('device')
                elif signal['signal'] == 'geo_anomaly':
                    search_terms.append('travel')
            
            # Search knowledge base
            kb_results = []
            if search_terms:
                for term in search_terms:
                    docs = KnowledgeBaseDocument.objects.filter(
                        content__icontains=term
                    )[:3]  # Limit to 3 results per term
                    
                    for doc in docs:
                        kb_results.append({
                            'doc_id': doc.id,
                            'title': doc.title,
                            'anchor': doc.anchor,
                            'extract': doc.content[:200] + '...' if len(doc.content) > 200 else doc.content
                        })
            
            return {
                'kb_results': kb_results,
                'search_terms': search_terms
            }
            
        except Exception as e:
            logger.error(f"Error in KBLookupTool: {str(e)}")
            return {'error': str(e)}


class DecideTool(BaseTool):
    """Make decision based on analysis."""
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # Get data from previous tool results
        risk_signals_result = context.get('riskSignals_result', {})
        user_message = context.get('user_message', '')
        
        risk_level = risk_signals_result.get('risk_level', 'low')
        risk_signals = risk_signals_result.get('risk_signals', [])
        
        try:
            # Determine action based on risk level and user message
            action = 'CONTACT_CUSTOMER'  # Default action
            reasons = []
            
            # High risk actions
            if risk_level == 'high':
                if any(signal['signal'] == 'chargeback_history' for signal in risk_signals):
                    action = 'ESCALATE_CASE'
                    reasons.append('Multiple chargeback history requires escalation')
                elif any(signal['signal'] == 'card_lost' for signal in risk_signals):
                    action = 'FREEZE_CARD'
                    reasons.append('Card reported lost/stolen')
                elif any(signal['signal'] == 'unauthorized_transaction' for signal in risk_signals):
                    action = 'OPEN_DISPUTE'
                    reasons.append('Unauthorized transaction reported')
                elif any(signal['signal'] == 'device_change' for signal in risk_signals):
                    action = 'FREEZE_CARD'
                    reasons.append('Untrusted device detected')
                else:
                    action = 'FREEZE_CARD'
                    reasons.append('High risk score detected')
            
            # Medium risk actions
            elif risk_level == 'medium':
                if 'dispute' in user_message.lower():
                    action = 'OPEN_DISPUTE'
                    reasons.append('Customer requested dispute')
                else:
                    action = 'CONTACT_CUSTOMER'
                    reasons.append('Medium risk requires customer verification')
            
            # Low risk actions
            else:
                if any(signal['signal'] == 'duplicate_transaction' for signal in risk_signals):
                    action = 'EXPLAIN_ONLY'
                    reasons.append('Duplicate transaction explanation needed')
                elif 'dispute' in user_message.lower():
                    action = 'OPEN_DISPUTE'
                    reasons.append('Customer requested dispute')
                else:
                    action = 'EXPLAIN_ONLY'
                    reasons.append('Low risk, provide explanation')
            
            return {
                'decision': {
                    'action': action,
                    'reasons': reasons,
                    'risk_level': risk_level
                }
            }
            
        except Exception as e:
            logger.error(f"Error in DecideTool: {str(e)}")
            return {'error': str(e)}


class ProposeActionTool(BaseTool):
    """Propose final action with details."""
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        decision = context.get('decide_result', {})
        profile = context.get('getProfile_result', {})
        recent_txns_result = context.get('getRecentTransactions_result', {})
        suspect_transaction = recent_txns_result.get('suspect_transaction')
        kb_results = context.get('kbLookup_result', {}).get('kb_results', [])
        
        try:
            # Get the decision from the DecideTool
            decision_result = context.get('decide_result', {})
            decision = decision_result.get('decision', {})
            action = decision.get('action', 'CONTACT_CUSTOMER')
            reasons = decision.get('reasons', [])
            risk_level = decision.get('risk_level', 'low')
            
            # Build action proposal
            proposal = {
                'action': action,
                'risk_level': risk_level,
                'reasons': reasons,
                'otp_required': action in ['FREEZE_CARD', 'OPEN_DISPUTE'],
                'citations': [
                    {
                        'title': result['title'],
                        'anchor': result['anchor']
                    }
                    for result in kb_results
                ]
            }
            
            # Update transaction status based on action
            if suspect_transaction:
                transaction_id = suspect_transaction.get('id')
                if transaction_id:
                    try:
                        from apps.transactions.models import Transaction
                        transaction = await sync_to_async(Transaction.objects.get)(id=transaction_id)
                        
                        # Update transaction status based on action
                        if action == 'FREEZE_CARD':
                            transaction.status = 'FROZEN'
                        elif action == 'OPEN_DISPUTE':
                            transaction.status = 'DISPUTED'
                        elif action == 'ESCALATE_CASE':
                            transaction.status = 'ESCALATED'
                        elif action == 'CONTACT_CUSTOMER':
                            transaction.status = 'UNDER_REVIEW'
                        else:
                            transaction.status = 'COMPLETED'
                        
                        await sync_to_async(transaction.save)()
                        logger.info(f"Updated transaction {transaction_id} status to {transaction.status}")
                        
                    except Transaction.DoesNotExist:
                        logger.error(f"Transaction {transaction_id} not found")
                    except Exception as e:
                        logger.error(f"Error updating transaction status: {str(e)}")
            
            # Add action-specific details
            if action == 'FREEZE_CARD':
                proposal['card_id'] = profile.get('cards', [{}])[0].get('id')
                proposal['message'] = 'Card will be frozen to prevent unauthorized transactions'
            
            elif action == 'OPEN_DISPUTE':
                proposal['transaction_id'] = suspect_transaction.get('id') if suspect_transaction else None
                proposal['reason_code'] = '10.4'  # Unauthorized transaction
                proposal['message'] = 'Dispute will be opened for unauthorized transaction'
            
            elif action == 'CONTACT_CUSTOMER':
                proposal['message'] = 'Customer will be contacted for verification'
            
            elif action == 'ESCALATE_CASE':
                proposal['message'] = 'Case will be escalated for manual review'
            
            elif action == 'EXPLAIN_ONLY':
                proposal['message'] = 'Explanation will be provided to customer'
            
            # Set final result
            context['final_result'] = proposal
            
            return {'final_result': proposal}
            
        except Exception as e:
            logger.error(f"Error in ProposeActionTool: {str(e)}")
            return {'error': str(e)}
