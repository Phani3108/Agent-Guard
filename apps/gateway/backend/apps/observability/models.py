from django.db import models
import uuid


def generate_metric_id():
    return f"metric_{uuid.uuid4().hex[:8]}"


def generate_audit_id():
    return f"audit_{uuid.uuid4().hex[:8]}"


def generate_ratelimit_id():
    return f"ratelimit_{uuid.uuid4().hex[:8]}"


class Metric(models.Model):
    METRIC_TYPES = [
        ('COUNTER', 'Counter'),
        ('GAUGE', 'Gauge'),
        ('HISTOGRAM', 'Histogram'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_metric_id)
    name = models.CharField(max_length=255)
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    value = models.FloatField()
    labels = models.JSONField(default=dict, blank=True)  # Prometheus-style labels
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'metrics'
        indexes = [
            models.Index(fields=['name', 'timestamp']),
            models.Index(fields=['metric_type']),
        ]
    
    def __str__(self):
        return f"{self.name}: {self.value}"


class AuditLog(models.Model):
    EVENT_TYPES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('ACTION_CREATED', 'Action Created'),
        ('ACTION_COMPLETED', 'Action Completed'),
        ('ACTION_BLOCKED', 'Action Blocked'),
        ('PII_ACCESSED', 'PII Accessed'),
        ('RATE_LIMITED', 'Rate Limited'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_audit_id)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    user_id = models.CharField(max_length=100, blank=True)
    customer_id = models.CharField(max_length=50, blank=True)
    request_id = models.CharField(max_length=100, blank=True)
    session_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user_id', 'timestamp']),
            models.Index(fields=['customer_id', 'timestamp']),
            models.Index(fields=['request_id']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.user_id} - {self.timestamp}"


class RateLimitLog(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_ratelimit_id)
    user_id = models.CharField(max_length=100)
    endpoint = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    blocked_at = models.DateTimeField(auto_now_add=True)
    retry_after_ms = models.IntegerField()
    
    class Meta:
        db_table = 'rate_limit_logs'
        indexes = [
            models.Index(fields=['user_id', 'blocked_at']),
            models.Index(fields=['ip_address', 'blocked_at']),
        ]
    
    def __str__(self):
        return f"Rate limit for {self.user_id} on {self.endpoint}"