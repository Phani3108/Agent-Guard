"""
Fallback Manager for Agent Tools
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class FallbackManager:
    """
    Manages fallback responses when agent tools fail.
    """
    
    def __init__(self):
        self.fallbacks = {
            'getProfile': self._get_profile_fallback,
            'getRecentTransactions': self._get_transactions_fallback,
            'riskSignals': self._get_risk_signals_fallback,
            'kbLookup': self._get_kb_fallback,
            'decide': self._get_decide_fallback,
            'proposeAction': self._get_propose_action_fallback
        }
    
    async def get_fallback(self, tool_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get fallback response for a tool.
        """
        if tool_name in self.fallbacks:
            return await self.fallbacks[tool_name](context)
        else:
            return {'error': f'No fallback available for {tool_name}'}
    
    async def _get_profile_fallback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback for profile retrieval."""
        customer_id = context.get('customer_id', 'unknown')
        
        return {
            'profile': {
                'customer_id': customer_id,
                'name': 'Customer',
                'email_masked': '***@***.***',
                'risk_flags': [],
                'cards': [],
                'devices': [],
                'recent_chargebacks': 0
            },
            'fallback_used': True,
            'fallback_reason': 'Profile service unavailable'
        }
    
    async def _get_transactions_fallback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback for transaction retrieval."""
        return {
            'recent_transactions': [],
            'transaction_count': 0,
            'fallback_used': True,
            'fallback_reason': 'Transaction service unavailable'
        }
    
    async def _get_risk_signals_fallback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback for risk analysis."""
        return {
            'risk_signals': [
                {
                    'signal': 'risk_unavailable',
                    'description': 'Risk assessment service unavailable',
                    'risk_level': 'medium'
                }
            ],
            'risk_score': 50,  # Medium risk as fallback
            'risk_level': 'medium',
            'fallback_used': True,
            'fallback_reason': 'Risk service unavailable'
        }
    
    async def _get_kb_fallback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback for knowledge base lookup."""
        return {
            'kb_results': [
                {
                    'doc_id': 'fallback_001',
                    'title': 'General Information',
                    'anchor': 'kb_general',
                    'extract': 'Please contact customer service for assistance.'
                }
            ],
            'search_terms': [],
            'fallback_used': True,
            'fallback_reason': 'Knowledge base unavailable'
        }
    
    async def _get_decide_fallback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback for decision making."""
        return {
            'decision': {
                'action': 'CONTACT_CUSTOMER',
                'reasons': ['Service unavailable, manual review required'],
                'risk_level': 'medium'
            },
            'fallback_used': True,
            'fallback_reason': 'Decision service unavailable'
        }
    
    async def _get_propose_action_fallback(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback for action proposal."""
        return {
            'final_result': {
                'action': 'CONTACT_CUSTOMER',
                'risk_level': 'medium',
                'reasons': ['Service unavailable, manual review required'],
                'otp_required': False,
                'citations': [],
                'message': 'Please contact customer service for assistance.'
            },
            'fallback_used': True,
            'fallback_reason': 'Action service unavailable'
        }
