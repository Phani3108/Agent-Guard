from django.contrib import admin
from .models import Customer, Card, Device

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email_masked', 'risk_flags', 'created_at']
    list_filter = ['risk_flags', 'created_at']
    search_fields = ['id', 'name', 'email_masked']
    readonly_fields = ['id', 'created_at']

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'last4', 'status', 'network', 'created_at']
    list_filter = ['status', 'network', 'created_at']
    search_fields = ['id', 'customer__name', 'last4']
    readonly_fields = ['id', 'created_at']

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'device_type', 'is_trusted', 'last_seen']
    list_filter = ['device_type', 'is_trusted', 'last_seen']
    search_fields = ['id', 'customer__name', 'device_fingerprint']
    readonly_fields = ['id', 'last_seen']
