from django.db import models
import uuid


def generate_kb_id():
    return f"kb_{uuid.uuid4().hex[:8]}"


def generate_insight_id():
    return f"insight_{uuid.uuid4().hex[:8]}"


class KnowledgeBaseDocument(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_kb_id)
    title = models.CharField(max_length=255)
    anchor = models.CharField(max_length=100)  # For citations
    content = models.TextField()
    chunks = models.JSONField(default=list, blank=True)  # Pre-processed chunks for RAG
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'kb_documents'
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['anchor']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.anchor})"


class InsightReport(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_insight_id)
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='insights')
    report_type = models.CharField(max_length=50)  # 'spend_summary', 'fraud_analysis', etc.
    data = models.JSONField()  # Report data
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'insight_reports'
        indexes = [
            models.Index(fields=['customer', 'report_type']),
            models.Index(fields=['generated_at']),
        ]
    
    def __str__(self):
        return f"{self.report_type} for {self.customer.name}"


class SpendCategory(models.Model):
    mcc = models.CharField(max_length=10, primary_key=True)
    category_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'spend_categories'
    
    def __str__(self):
        return f"{self.mcc} - {self.category_name}"