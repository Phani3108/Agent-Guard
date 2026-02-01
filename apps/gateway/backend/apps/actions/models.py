from django.db import models
import uuid


def generate_action_id():
    return f"action_{uuid.uuid4().hex[:8]}"


def generate_dispute_id():
    return f"dispute_{uuid.uuid4().hex[:8]}"


class Action(models.Model):
    ACTION_TYPES = [
        ('FREEZE_CARD', 'Freeze Card'),
        ('UNFREEZE_CARD', 'Unfreeze Card'),
        ('OPEN_DISPUTE', 'Open Dispute'),
        ('CONTACT_CUSTOMER', 'Contact Customer'),
        ('ESCALATE_CASE', 'Escalate Case'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PENDING_OTP', 'Pending OTP'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('BLOCKED', 'Blocked'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_action_id)
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='actions')
    transaction = models.ForeignKey('transactions.Transaction', on_delete=models.CASCADE, null=True, blank=True)
    card = models.ForeignKey('customers.Card', on_delete=models.CASCADE, null=True, blank=True)
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    parameters = models.JSONField(default=dict, blank=True)  # Action-specific parameters
    result = models.JSONField(default=dict, blank=True)  # Action result
    otp_required = models.BooleanField(default=False)
    otp_provided = models.CharField(max_length=10, blank=True)
    otp_verified = models.BooleanField(default=False)
    policy_blocked = models.BooleanField(default=False)
    policy_reason = models.CharField(max_length=255, blank=True)
    created_by = models.CharField(max_length=100)  # User/agent who initiated
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'actions'
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['action_type', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.action_type} - {self.customer.name} - {self.status}"


class Dispute(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_dispute_id)
    action = models.OneToOneField(Action, on_delete=models.CASCADE, related_name='dispute')
    case_id = models.CharField(max_length=50, unique=True)
    reason_code = models.CharField(max_length=10)
    amount = models.BigIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'disputes'
        indexes = [
            models.Index(fields=['case_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Dispute {self.case_id} - {self.reason_code} - {self.status}"