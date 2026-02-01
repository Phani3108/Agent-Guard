from django.db import models
from django.contrib.auth.models import User
import uuid


def generate_customer_id():
    return f"cust_{uuid.uuid4().hex[:8]}"


def generate_card_id():
    return f"card_{uuid.uuid4().hex[:8]}"


def generate_device_id():
    return f"dev_{uuid.uuid4().hex[:8]}"


class Customer(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_customer_id)
    name = models.CharField(max_length=255)
    email_masked = models.CharField(max_length=255)  # Masked email like u***@d***.com
    risk_flags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers'
        indexes = [
            models.Index(fields=['email_masked']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.id})"


class Card(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('FROZEN', 'Frozen'),
        ('BLOCKED', 'Blocked'),
        ('EXPIRED', 'Expired'),
    ]
    
    NETWORK_CHOICES = [
        ('VISA', 'Visa'),
        ('MASTERCARD', 'Mastercard'),
        ('AMEX', 'American Express'),
        ('RUPAY', 'RuPay'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_card_id)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='cards')
    last4 = models.CharField(max_length=4)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    network = models.CharField(max_length=20, choices=NETWORK_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cards'
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['last4']),
        ]
    
    def __str__(self):
        return f"****{self.last4} ({self.network}) - {self.status}"


class Device(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_device_id)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='devices')
    device_type = models.CharField(max_length=50, default='mobile')
    device_fingerprint = models.CharField(max_length=255, blank=True)
    is_trusted = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'devices'
        indexes = [
            models.Index(fields=['customer', 'is_trusted']),
            models.Index(fields=['last_seen']),
        ]
    
    def __str__(self):
        return f"{self.device_type} - {self.customer.name}"