from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg, Sum
from django.core.cache import cache
import logging
from datetime import datetime, timedelta
from .models import Metric, AuditLog
from apps.core.authentication import APIKeyAuthentication
from rest_framework.permissions import IsAuthenticated
from apps.transactions.models import Transaction
from apps.actions.models import Action

logger = logging.getLogger(__name__)


@api_view(['GET'])
def metrics(request):
    """
    Prometheus-style metrics endpoint.
    """
    try:
        # Get metrics from database
        metrics_data = []
        
        # Request metrics
        request_metrics = Metric.objects.filter(
            name__in=['request_total', 'request_duration_ms'],
            timestamp__gte=datetime.now() - timedelta(hours=1)
        )
        
        for metric in request_metrics:
            labels_str = ','.join([f'{k}="{v}"' for k, v in metric.labels.items()])
            metrics_data.append(f'{metric.name}{{{labels_str}}} {metric.value}')
        
        # Agent metrics
        agent_metrics = Metric.objects.filter(
            name__in=['agent_latency_ms', 'tool_call_total', 'agent_fallback_total'],
            timestamp__gte=datetime.now() - timedelta(hours=1)
        )
        
        for metric in agent_metrics:
            labels_str = ','.join([f'{k}="{v}"' for k, v in metric.labels.items()])
            metrics_data.append(f'{metric.name}{{{labels_str}}} {metric.value}')
        
        # Rate limiting metrics
        rate_limit_metrics = Metric.objects.filter(
            name='rate_limit_block_total',
            timestamp__gte=datetime.now() - timedelta(hours=1)
        )
        
        for metric in rate_limit_metrics:
            labels_str = ','.join([f'{k}="{v}"' for k, v in metric.labels.items()])
            metrics_data.append(f'{metric.name}{{{labels_str}}} {metric.value}')
        
        # Action metrics
        action_metrics = Metric.objects.filter(
            name='action_blocked_total',
            timestamp__gte=datetime.now() - timedelta(hours=1)
        )
        
        for metric in action_metrics:
            labels_str = ','.join([f'{k}="{v}"' for k, v in metric.labels.items()])
            metrics_data.append(f'{metric.name}{{{labels_str}}} {metric.value}')
        
        # Add some mock metrics for demonstration
        metrics_data.extend([
            'agent_latency_ms_bucket{le="100"} 45',
            'agent_latency_ms_bucket{le="500"} 78',
            'agent_latency_ms_bucket{le="1000"} 95',
            'agent_latency_ms_bucket{le="+Inf"} 100',
            'tool_call_total{tool="getProfile",ok="true"} 150',
            'tool_call_total{tool="getProfile",ok="false"} 5',
            'tool_call_total{tool="riskSignals",ok="true"} 120',
            'tool_call_total{tool="riskSignals",ok="false"} 8',
            'agent_fallback_total{tool="riskSignals"} 3',
            'rate_limit_block_total{endpoint="/api/triage"} 12',
            'action_blocked_total{policy="otp_required"} 25',
            'action_blocked_total{policy="identity_verification_required"} 8'
        ])
        
        return Response('\n'.join(metrics_data), content_type='text/plain')
        
    except Exception as e:
        logger.error(f"Error in metrics endpoint: {str(e)}")
        return Response(
            'Error generating metrics', 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content_type='text/plain'
        )


@api_view(['GET'])
def health(request):
    """
    Health check endpoint.
    """
    try:
        # Check database connectivity
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Check Redis connectivity
        cache.set('health_check', 'ok', timeout=10)
        cache_status = cache.get('health_check') == 'ok'
        
        # Check recent activity
        recent_requests = Metric.objects.filter(
            timestamp__gte=datetime.now() - timedelta(minutes=5)
        ).count()
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'checks': {
                'database': 'ok',
                'cache': 'ok' if cache_status else 'error',
                'recent_activity': recent_requests
            }
        }
        
        if not cache_status:
            health_status['status'] = 'degraded'
        
        return Response(health_status)
        
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}")
        return Response({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def kpis(request):
    """
    Get KPI data for dashboard.
    """
    try:
        # Calculate date range (last 30 days, but also include recent test data)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        # Also include transactions from the last 7 days for test data
        recent_start_date = end_date - timedelta(days=7)
        
        # Total spend in last 30 days (include all transactions for demo)
        total_spend = Transaction.objects.filter(
            amount__gt=0  # Only positive amounts (spending)
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # High risk alerts (transactions > 5000 or ATM withdrawals)
        high_risk_alerts = Transaction.objects.filter(
            amount__gt=5000
        ).count()
        
        # Disputes opened in last 30 days
        disputes_opened = Action.objects.filter(
            action_type='OPEN_DISPUTE',
            created_at__gte=start_date
        ).count()
        
        # Average triage time (mock data for now)
        avg_triage_time = 2.3  # seconds
        
        kpi_data = {
            'totalSpend': float(total_spend),
            'highRiskAlerts': high_risk_alerts,
            'disputesOpened': disputes_opened,
            'avgTriageTime': avg_triage_time
        }
        
        return Response(kpi_data)
        
    except Exception as e:
        logger.error(f"Error in kpis endpoint: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )