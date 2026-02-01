from django.db import models
import uuid


def generate_transaction_id():
    return f"txn_{uuid.uuid4().hex[:8]}"


def generate_chargeback_id():
    return f"cb_{uuid.uuid4().hex[:8]}"


class Transaction(models.Model):
    CURRENCY_CHOICES = [
        ('INR', 'Indian Rupee'),
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_transaction_id)
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='transactions')
    card = models.ForeignKey('customers.Card', on_delete=models.CASCADE, related_name='transactions')
    mcc = models.CharField(max_length=10)  # Merchant Category Code
    merchant = models.CharField(max_length=255)
    amount = models.BigIntegerField()  # Amount in paise/cents
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='INR')
    timestamp = models.DateTimeField()
    device = models.ForeignKey('customers.Device', on_delete=models.SET_NULL, null=True, blank=True)
    geo_lat = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    geo_lon = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    geo_country = models.CharField(max_length=3, default='IN')
    status = models.CharField(max_length=20, default='COMPLETED')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'transactions'
        indexes = [
            models.Index(fields=['customer', '-timestamp']),  # For 90-day queries
            models.Index(fields=['merchant']),
            models.Index(fields=['mcc']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['device']),
            models.Index(fields=['geo_country']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.merchant} - ₹{self.amount/100:.2f} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"
    
    @property
    def amount_in_rupees(self):
        return self.amount / 100


class Chargeback(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('RESOLVED', 'Resolved'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_chargeback_id)
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='chargebacks')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='chargebacks')
    reason_code = models.CharField(max_length=10)
    amount = models.BigIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'chargebacks'
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Chargeback {self.id} - {self.reason_code} - {self.status}"