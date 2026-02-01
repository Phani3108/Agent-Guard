from django.contrib import admin
from .models import AgentExecution, ToolCall, AgentFallback

@admin.register(AgentExecution)
class AgentExecutionAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'transaction', 'execution_type', 'status', 'duration_ms', 'started_at']
    list_filter = ['execution_type', 'status', 'started_at']
    search_fields = ['id', 'customer__name', 'transaction__id']
    readonly_fields = ['id', 'started_at', 'completed_at']

@admin.register(ToolCall)
class ToolCallAdmin(admin.ModelAdmin):
    list_display = ['id', 'execution', 'tool_name', 'status', 'started_at']
    list_filter = ['tool_name', 'status', 'started_at']
    search_fields = ['id', 'execution__id', 'tool_name']
    readonly_fields = ['id', 'started_at']

@admin.register(AgentFallback)
class AgentFallbackAdmin(admin.ModelAdmin):
    list_display = ['id', 'execution', 'tool_name', 'fallback_reason', 'created_at']
    list_filter = ['tool_name', 'created_at']
    search_fields = ['id', 'execution__id', 'tool_name']
    readonly_fields = ['id', 'created_at']
