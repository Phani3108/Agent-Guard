"""
Observability Middleware
"""

import time
import uuid
import logging
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.conf import settings
from .models import Metric, RateLimitLog

logger = logging.getLogger(__name__)


class LoggingMiddleware(MiddlewareMixin):
    """
    Middleware for structured logging and request tracing.
    """
    
    def process_request(self, request):
        # Generate request ID
        request.request_id = str(uuid.uuid4())
        request.start_time = time.time()
        
        # Add request ID to context for logging
        logger.info(f"Request started: {request.method} {request.path}", extra={
            'requestId': request.request_id,
            'method': request.method,
            'path': request.path,
            'userAgent': request.META.get('HTTP_USER_AGENT', ''),
            'ipAddress': self.get_client_ip(request)
        })
    
    def process_response(self, request, response):
        # Calculate request duration
        duration_ms = int((time.time() - getattr(request, 'start_time', time.time())) * 1000)
        
        # Log request completion
        logger.info(f"Request completed: {request.method} {request.path} - {response.status_code}", extra={
            'requestId': getattr(request, 'request_id', 'unknown'),
            'method': request.method,
            'path': request.path,
            'statusCode': response.status_code,
            'durationMs': duration_ms
        })
        
        # Record metrics
        self.record_metrics(request, response, duration_ms)
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def record_metrics(self, request, response, duration_ms):
        """Record request metrics."""
        try:
            # Record request duration
            Metric.objects.create(
                name='request_duration_ms',
                metric_type='HISTOGRAM',
                value=duration_ms,
                labels={
                    'method': request.method,
                    'path': request.path,
                    'status_code': str(response.status_code)
                }
            )
            
            # Record request count
            Metric.objects.create(
                name='request_total',
                metric_type='COUNTER',
                value=1,
                labels={
                    'method': request.method,
                    'path': request.path,
                    'status_code': str(response.status_code)
                }
            )
            
        except Exception as e:
            logger.error(f"Error recording metrics: {str(e)}")


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware using token bucket algorithm.
    """
    
    def process_request(self, request):
        # Skip rate limiting for certain paths
        if request.path.startswith('/admin/') or request.path.startswith('/static/'):
            return None
        
        # Get user identifier (API key or IP)
        user_id = self.get_user_identifier(request)
        
        # Check rate limit
        if not self.check_rate_limit(user_id, request.path):
            # Record rate limit event
            RateLimitLog.objects.create(
                user_id=user_id,
                endpoint=request.path,
                ip_address=self.get_client_ip(request),
                retry_after_ms=2000
            )
            
            # Record metric
            Metric.objects.create(
                name='rate_limit_block_total',
                metric_type='COUNTER',
                value=1,
                labels={
                    'endpoint': request.path,
                    'user_id': user_id
                }
            )
            
            from django.http import JsonResponse
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'retryAfterMs': 2000
            }, status=429)
        
        return None
    
    def get_user_identifier(self, request):
        """Get user identifier for rate limiting."""
        # Use API key if available
        api_key = request.META.get('HTTP_X_API_KEY')
        if api_key:
            return f"api_key:{api_key[:8]}"
        
        # Fall back to IP address
        return f"ip:{self.get_client_ip(request)}"
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def check_rate_limit(self, user_id, endpoint):
        """
        Check rate limit using token bucket algorithm.
        Rate limit: 5 requests per second per user.
        """
        try:
            # Rate limit configuration
            max_tokens = 5
            refill_rate = 1  # tokens per second
            window_size = 1  # seconds
            
            # Get current bucket state
            bucket_key = f"rate_limit:{user_id}:{endpoint}"
            bucket_data = cache.get(bucket_key)
            
            current_time = time.time()
            
            if bucket_data is None:
                # Initialize bucket
                bucket_data = {
                    'tokens': max_tokens,
                    'last_refill': current_time
                }
            else:
                # Refill tokens based on time elapsed
                time_elapsed = current_time - bucket_data['last_refill']
                tokens_to_add = int(time_elapsed * refill_rate)
                
                bucket_data['tokens'] = min(max_tokens, bucket_data['tokens'] + tokens_to_add)
                bucket_data['last_refill'] = current_time
            
            # Check if request is allowed
            if bucket_data['tokens'] > 0:
                bucket_data['tokens'] -= 1
                cache.set(bucket_key, bucket_data, timeout=window_size)
                return True
            else:
                cache.set(bucket_key, bucket_data, timeout=window_size)
                return False
                
        except Exception as e:
            logger.error(f"Error in rate limit check: {str(e)}")
            # Allow request if rate limiting fails
            return True
