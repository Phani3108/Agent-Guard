"""
Multi-Agent Orchestrator for Fraud Triage
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
from django.core.cache import cache
from django.conf import settings
from asgiref.sync import sync_to_async

from .models import AgentExecution, ToolCall, AgentFallback
from .tools import (
    GetProfileTool, GetRecentTransactionsTool, RiskSignalsTool,
    KBLookupTool, DecideTool, ProposeActionTool
)
from .fallbacks import FallbackManager

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Orchestrates multi-agent fraud triage workflow.
    """
    
    def __init__(self):
        self.tools = {
            'getProfile': GetProfileTool(),
            'getRecentTransactions': GetRecentTransactionsTool(),
            'riskSignals': RiskSignalsTool(),
            'kbLookup': KBLookupTool(),
            'decide': DecideTool(),
            'proposeAction': ProposeActionTool()
        }
        self.fallback_manager = FallbackManager()
        self.circuit_breakers = {}
    
    async def execute_triage(self, customer_id: str, suspect_txn_id: str, 
                           user_message: str = None) -> Dict[str, Any]:
        """
        Execute fraud triage workflow.
        """
        execution_id = f"exec_{uuid.uuid4().hex[:8]}"
        start_time = time.time()
        
        # Define execution plan
        plan = [
            "getProfile",
            "getRecentTransactions", 
            "riskSignals",
            "kbLookup",
            "decide",
            "proposeAction"
        ]
        
        # Create execution record
        execution = await sync_to_async(AgentExecution.objects.create)(
            id=execution_id,
            customer_id=customer_id,
            transaction_id=suspect_txn_id,
            execution_type='fraud_triage',
            status='RUNNING',
            plan=plan,
            trace={},
            result={}
        )
        
        try:
            # Execute plan
            context = {
                'customer_id': customer_id,
                'suspect_txn_id': suspect_txn_id,
                'user_message': user_message,
                'execution_id': execution_id
            }
            
            trace = await self._execute_plan(plan, context, execution)
            
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Update execution
            await sync_to_async(execution.save)()
            execution.trace = trace
            execution.status = 'COMPLETED'
            execution.completed_at = datetime.now()
            execution.duration_ms = duration_ms
            execution.result = trace.get('final_result', {})
            await sync_to_async(execution.save)()
            
            return {
                'execution_id': execution_id,
                'status': 'completed',
                'duration_ms': duration_ms,
                'result': trace.get('final_result', {}),
                'trace': trace
            }
            
        except Exception as e:
            logger.error(f"Error in execute_triage: {str(e)}")
            
            # Update execution with error
            execution.status = 'FAILED'
            execution.completed_at = datetime.now()
            execution.duration_ms = int((time.time() - start_time) * 1000)
            execution.result = {'error': str(e)}
            await sync_to_async(execution.save)()
            
            raise e
    
    async def execute_triage_with_progress(self, customer_id: str, suspect_txn_id: str,
                                         user_message: str, event_stream):
        """
        Execute fraud triage workflow with streaming progress updates.
        """
        execution_id = f"exec_{uuid.uuid4().hex[:8]}"
        start_time = time.time()
        
        # Define execution plan
        plan = [
            "getProfile",
            "getRecentTransactions", 
            "riskSignals",
            "kbLookup",
            "decide",
            "proposeAction"
        ]
        
        # Create execution record
        execution = await sync_to_async(AgentExecution.objects.create)(
            id=execution_id,
            customer_id=customer_id,
            transaction_id=suspect_txn_id,
            execution_type='fraud_triage',
            status='RUNNING',
            plan=plan,
            trace={},
            result={}
        )
        
        try:
            # Send initial event
            yield f"data: {json.dumps({'event': 'plan_built', 'plan': plan})}\n\n"
            
            # Execute plan and collect trace
            context = {
                'customer_id': customer_id,
                'suspect_txn_id': suspect_txn_id,
                'user_message': user_message,
                'execution_id': execution_id
            }
            
            trace = {}
            async for event in self._execute_plan_with_progress(plan, context, execution, event_stream):
                # This will yield events, but we need to collect the final trace
                pass
            
            # Get the final trace from the execution record
            await sync_to_async(execution.refresh_from_db)()
            trace = execution.trace
            
            # Calculate duration and update execution
            duration_ms = int((time.time() - start_time) * 1000)
            execution.trace = trace
            execution.status = 'COMPLETED'
            execution.completed_at = datetime.now()
            execution.duration_ms = duration_ms
            execution.result = trace.get('final_result', {})
            await sync_to_async(execution.save)()
            
            # Send final result
            yield f"data: {json.dumps({'event': 'decision_finalized', 'result': execution.result})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in execute_triage_with_progress: {str(e)}")
            
            # Update execution with error
            execution.status = 'FAILED'
            execution.completed_at = datetime.now()
            execution.duration_ms = int((time.time() - start_time) * 1000)
            execution.result = {'error': str(e)}
            await sync_to_async(execution.save)()
            
            # Send error event
            yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"
    
    async def _execute_plan(self, plan: List[str], context: Dict[str, Any], 
                          execution: AgentExecution) -> Dict[str, Any]:
        """
        Execute the agent plan.
        """
        trace = {
            'steps': [],
            'final_result': {}
        }
        
        for step in plan:
            try:
                # Execute tool
                tool = self.tools.get(step)
                if not tool:
                    raise ValueError(f"Unknown tool: {step}")
                
                # Record tool call
                tool_call = await sync_to_async(ToolCall.objects.create)(
                    execution=execution,
                    tool_name=step,
                    input_data=context,
                    status='RUNNING'
                )
                
                # Execute tool
                result = await tool.execute(context)
                
                # Update tool call
                tool_call.output_data = result
                tool_call.status = 'COMPLETED'
                await sync_to_async(tool_call.save)()
                
                # Add to trace
                trace['steps'].append({
                    'tool': step,
                    'status': 'completed',
                    'result': result
                })
                
                # Update context with result
                context[f'{step}_result'] = result
                
            except Exception as e:
                logger.error(f"Error executing tool {step}: {str(e)}")
                
                # Record failed tool call
                tool_call = await sync_to_async(ToolCall.objects.create)(
                    execution=execution,
                    tool_name=step,
                    input_data=context,
                    status='FAILED',
                    error_message=str(e)
                )
                
                # Try fallback
                fallback_result = await self.fallback_manager.get_fallback(step, context, str(e))
                
                # Add to trace
                trace['steps'].append({
                    'tool': step,
                    'status': 'failed',
                    'error': str(e),
                    'fallback_used': True,
                    'fallback_result': fallback_result
                })
                
                # Update context with fallback result
                context[f'{step}_result'] = fallback_result
        
        # Set final result
        trace['final_result'] = context.get('proposeAction_result', {})
        
        return trace
    
    async def _execute_plan_with_progress(self, plan: List[str], context: Dict[str, Any], 
                                        execution: AgentExecution, event_stream):
        """
        Execute the agent plan with progress updates.
        """
        trace = {
            'steps': [],
            'final_result': {}
        }
        
        for step in plan:
            try:
                # Send tool start event
                yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'started'})}\n\n"
                
                # Execute tool
                tool = self.tools.get(step)
                if not tool:
                    raise ValueError(f"Unknown tool: {step}")
                
                # Record tool call
                tool_call = await sync_to_async(ToolCall.objects.create)(
                    execution=execution,
                    tool_name=step,
                    input_data=context,
                    status='RUNNING'
                )
                
                # Execute tool
                result = await tool.execute(context)
                
                # Update tool call
                tool_call.output_data = result
                tool_call.status = 'COMPLETED'
                await sync_to_async(tool_call.save)()
                
                # Send tool completion event
                yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'completed', 'result': result})}\n\n"
                
                # Add to trace
                trace['steps'].append({
                    'tool': step,
                    'status': 'completed',
                    'result': result
                })
                
                # Update context with result
                context[f'{step}_result'] = result
                
            except Exception as e:
                logger.error(f"Error executing tool {step}: {str(e)}")
                
                # Record failed tool call
                tool_call = await sync_to_async(ToolCall.objects.create)(
                    execution=execution,
                    tool_name=step,
                    input_data=context,
                    status='FAILED',
                    error_message=str(e)
                )
                
                # Try fallback
                fallback_result = await self.fallback_manager.get_fallback(step, context, str(e))
                
                # Send fallback event
                yield f"data: {json.dumps({'event': 'fallback_triggered', 'tool': step, 'fallback_result': fallback_result})}\n\n"
                
                # Add to trace
                trace['steps'].append({
                    'tool': step,
                    'status': 'failed',
                    'error': str(e),
                    'fallback_used': True,
                    'fallback_result': fallback_result
                })
                
                # Update context with fallback result
                context[f'{step}_result'] = fallback_result
        
        # Set final result
        trace['final_result'] = context.get('proposeAction_result', {})
        
        # Update execution trace
        execution.trace = trace
        await sync_to_async(execution.save)()
        
        return trace
