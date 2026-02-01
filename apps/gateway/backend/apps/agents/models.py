from django.db import models
import uuid


def generate_execution_id():
    return f"exec_{uuid.uuid4().hex[:8]}"


def generate_tool_call_id():
    return f"tool_{uuid.uuid4().hex[:8]}"


def generate_trace_id():
    return f"trace_{uuid.uuid4().hex[:8]}"


def generate_fallback_id():
    return f"fallback_{uuid.uuid4().hex[:8]}"


class AgentExecution(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('TIMEOUT', 'Timeout'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_execution_id)
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='agent_executions')
    transaction = models.ForeignKey('transactions.Transaction', on_delete=models.CASCADE, null=True, blank=True)
    execution_type = models.CharField(max_length=50)  # 'fraud_triage', 'insights', etc.
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    plan = models.JSONField(default=list, blank=True)  # Execution plan
    trace = models.JSONField(default=dict, blank=True)  # Execution trace
    result = models.JSONField(default=dict, blank=True)  # Final result
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'agent_executions'
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['started_at']),
            models.Index(fields=['execution_type']),
        ]
    
    def __str__(self):
        return f"{self.execution_type} - {self.customer.name} - {self.status}"


class ToolCall(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('ERROR', 'Error'),
        ('TIMEOUT', 'Timeout'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_tool_call_id)
    execution = models.ForeignKey(AgentExecution, on_delete=models.CASCADE, related_name='tool_calls')
    tool_name = models.CharField(max_length=100)
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'tool_calls'
        indexes = [
            models.Index(fields=['execution', 'tool_name']),
            models.Index(fields=['status']),
            models.Index(fields=['started_at']),
        ]
    
    def __str__(self):
        return f"{self.tool_name} - {self.status}"


class AgentFallback(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_fallback_id)
    execution = models.ForeignKey(AgentExecution, on_delete=models.CASCADE, related_name='fallbacks')
    tool_name = models.CharField(max_length=100)
    fallback_reason = models.CharField(max_length=255)
    fallback_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'agent_fallbacks'
        indexes = [
            models.Index(fields=['execution', 'tool_name']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Fallback for {self.tool_name} - {self.fallback_reason}"