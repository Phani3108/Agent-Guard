from django.contrib import admin
from .models import Transaction, Chargeback

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'merchant', 'amount', 'currency', 'status', 'timestamp']
    list_filter = ['status', 'currency', 'mcc', 'timestamp', 'geo_country']
    search_fields = ['id', 'customer__name', 'merchant', 'card__last4']
    readonly_fields = ['id', 'timestamp', 'created_at']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']

@admin.register(Chargeback)
class ChargebackAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'transaction', 'reason_code', 'amount', 'status', 'created_at']
    list_filter = ['status', 'reason_code', 'created_at']
    search_fields = ['id', 'customer__name', 'transaction__id']
    readonly_fields = ['id', 'created_at']
