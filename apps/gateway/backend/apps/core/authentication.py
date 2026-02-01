from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class APIKeyAuthentication(BaseAuthentication):
    """
    API key authentication with role-based access control.
    """
    
    def authenticate(self, request):
        api_key = request.META.get('HTTP_X_API_KEY')
        
        if not api_key:
            return None
            
        # Check for agent role (requires OTP for sensitive actions)
        if api_key == settings.API_KEY:
            user = AgentUser(role='agent')
            return (user, None)
        
        # Check for lead role (can bypass OTP)
        if api_key == getattr(settings, 'LEAD_API_KEY', settings.API_KEY + '_lead'):
            user = AgentUser(role='lead')
            return (user, None)
            
        raise AuthenticationFailed('Invalid API key')
    
    def authenticate_header(self, request):
        return 'X-API-Key'


class AgentUser:
    """
    Dummy user class for API key authentication.
    """
    
    def __init__(self, role='agent'):
        self.role = role
        self.is_authenticated = True
        self.is_anonymous = False
    
    def has_perm(self, perm):
        """Check if user has permission based on role."""
        if self.role == 'lead':
            return True
        return perm in ['agent.basic_access']
    
    def __str__(self):
        return f"AgentUser({self.role})"
