from django.contrib import admin
from .models import Action, Dispute

@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ['id', 'action_type', 'customer', 'status', 'created_at', 'completed_at']
    list_filter = ['action_type', 'status', 'created_at']
    search_fields = ['id', 'customer__name', 'action_type']
    readonly_fields = ['id', 'created_at', 'completed_at']

@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ['id', 'action', 'case_id', 'reason_code', 'amount', 'status']
    list_filter = ['status', 'reason_code']
    search_fields = ['id', 'case_id', 'action__customer__name']
    readonly_fields = ['id']
