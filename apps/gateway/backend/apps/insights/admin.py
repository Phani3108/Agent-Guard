from django.contrib import admin
from .models import KnowledgeBaseDocument, InsightReport, SpendCategory

@admin.register(KnowledgeBaseDocument)
class KnowledgeBaseDocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'anchor', 'created_at']
    list_filter = ['created_at']
    search_fields = ['id', 'title', 'content']
    readonly_fields = ['id', 'created_at']

@admin.register(InsightReport)
class InsightReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'report_type', 'generated_at']
    list_filter = ['report_type', 'generated_at']
    search_fields = ['id', 'customer__name', 'report_type']
    readonly_fields = ['id', 'generated_at']

@admin.register(SpendCategory)
class SpendCategoryAdmin(admin.ModelAdmin):
    list_display = ['mcc', 'category_name', 'description']
    list_filter = ['mcc']
    search_fields = ['mcc', 'category_name']
    readonly_fields = ['mcc']
