from django.contrib import admin
from .models import Metric, AuditLog, RateLimitLog

@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'value', 'labels', 'timestamp']
    list_filter = ['name', 'timestamp']
    search_fields = ['id', 'name']
    readonly_fields = ['id', 'timestamp']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'event_type', 'user_id', 'customer_id', 'timestamp']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['id', 'user_id', 'event_type']
    readonly_fields = ['id', 'timestamp']

@admin.register(RateLimitLog)
class RateLimitLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_id', 'endpoint', 'ip_address', 'blocked_at']
    list_filter = ['endpoint', 'blocked_at']
    search_fields = ['id', 'user_id', 'endpoint']
    readonly_fields = ['id', 'blocked_at']
