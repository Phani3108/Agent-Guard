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
        
        # Create execution record
        execution = AgentExecution.objects.create(
            id=execution_id,
            customer_id=customer_id,
            transaction_id=suspect_txn_id,
            execution_type='fraud_triage',
            status='RUNNING',
            plan=[],
            trace={},
            result={}
        )
        
        try:
            # Define execution plan
            plan = [
                "getProfile",
                "getRecentTransactions", 
                "riskSignals",
                "kbLookup",
                "decide",
                "proposeAction"
            ]
            
            execution.plan = plan
            execution.save()
            
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
            execution.trace = trace
            execution.status = 'COMPLETED'
            execution.completed_at = datetime.now()
            execution.duration_ms = duration_ms
            execution.result = trace.get('final_result', {})
            execution.save()
            
            return {
                'execution_id': execution_id,
                'status': 'completed',
                'duration_ms': duration_ms,
                'trace': trace,
                'result': execution.result
            }
            
        except Exception as e:
            logger.error(f"Error in execute_triage: {str(e)}")
            
            # Update execution with error
            execution.status = 'FAILED'
            execution.completed_at = datetime.now()
            execution.duration_ms = int((time.time() - start_time) * 1000)
            execution.save()
            
        return {
            'execution_id': execution_id,
            'status': 'failed',
            'error': str(e),
            'trace': execution.trace
        }
    
    async def execute_triage_with_progress(self, customer_id: str, suspect_txn_id: str, 
                                         user_message: str, event_stream):
        """
        Execute fraud triage with progress streaming.
        """
        execution_id = f"exec_{uuid.uuid4().hex[:8]}"
        start_time = time.time()
        
        # Create execution record
        execution = AgentExecution.objects.create(
            id=execution_id,
            customer_id=customer_id,
            transaction_id=suspect_txn_id,
            execution_type='fraud_triage',
            status='RUNNING',
            plan=[],
            trace={},
            result={}
        )
        
        try:
            # Define execution plan
            plan = [
                "getProfile",
                "getRecentTransactions", 
                "riskSignals",
                "kbLookup",
                "decide",
                "proposeAction"
            ]
            
            execution.plan = plan
            execution.save()
            
            # Send plan built event
            yield f"data: {json.dumps({'event': 'plan_built', 'plan': plan})}\n\n"
            
            # Execute plan
            context = {
                'customer_id': customer_id,
                'suspect_txn_id': suspect_txn_id,
                'user_message': user_message,
                'execution_id': execution_id
            }
            
            # Execute plan and collect trace
            trace = {}
            async for event in self._execute_plan_with_progress(plan, context, execution, event_stream):
                # This will yield events, but we need to collect the final trace
                pass
            
            # Get the final trace from the execution record
            execution.refresh_from_db()
            trace = execution.trace
            
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Update execution
            execution.trace = trace
            execution.status = 'COMPLETED'
            execution.completed_at = datetime.now()
            execution.duration_ms = duration_ms
            execution.result = trace.get('final_result', {})
            execution.save()
            
            # Send final result
            yield f"data: {json.dumps({'event': 'decision_finalized', 'result': execution.result})}\n\n"
            
        except Exception as e:
            logger.error(f"Error in execute_triage_with_progress: {str(e)}")
            
            # Update execution with error
            execution.status = 'FAILED'
            execution.completed_at = datetime.now()
            execution.duration_ms = int((time.time() - start_time) * 1000)
            execution.save()
            
            # Send error event
            yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"
    
    async def _execute_plan_with_progress(self, plan: List[str], context: Dict[str, Any], 
                                        execution: AgentExecution, event_stream) -> Dict[str, Any]:
        """
        Execute the agent plan with progress streaming.
        """
        trace = {
            'steps': [],
            'start_time': datetime.now().isoformat(),
            'context': context
        }
        
        for step in plan:
            try:
                # Send tool update event
                yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'starting'})}\n\n"
                
                # Check circuit breaker
                if self._is_circuit_breaker_open(step):
                    logger.warning(f"Circuit breaker open for {step}, using fallback")
                    yield f"data: {json.dumps({'event': 'fallback_triggered', 'tool': step, 'reason': 'circuit_breaker'})}\n\n"
                    result = await self._handle_fallback(step, context, execution)
                    trace['steps'].append(result)
                    continue
                
                # Execute tool
                tool = self.tools[step]
                tool_call = ToolCall.objects.create(
                    execution=execution,
                    tool_name=step,
                    input_data=context,
                    status='PENDING'
                )
                
                start_time = time.time()
                
                try:
                    # Execute with timeout
                    result = await asyncio.wait_for(
                        tool.execute(context),
                        timeout=settings.TOOL_TIMEOUT
                    )
                    
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    # Update tool call
                    tool_call.status = 'SUCCESS'
                    tool_call.output_data = result
                    tool_call.completed_at = datetime.now()
                    tool_call.duration_ms = duration_ms
                    tool_call.save()
                    
                    # Update context with result
                    context.update(result)
                    
                    # Reset circuit breaker on success
                    self._reset_circuit_breaker(step)
                    
                    # Send success event
                    yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'success', 'duration_ms': duration_ms})}\n\n"
                    
                    trace['steps'].append({
                        'step': step,
                        'status': 'success',
                        'duration_ms': duration_ms,
                        'result': result
                    })
                    
                except asyncio.TimeoutError:
                    logger.error(f"Tool {step} timed out")
                    yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'timeout'})}\n\n"
                    await self._handle_tool_failure(step, "timeout", tool_call, execution)
                    yield f"data: {json.dumps({'event': 'fallback_triggered', 'tool': step, 'reason': 'timeout'})}\n\n"
                    result = await self._handle_fallback(step, context, execution)
                    trace['steps'].append(result)
                    
                except Exception as e:
                    logger.error(f"Tool {step} failed: {str(e)}")
                    yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'error', 'error': str(e)})}\n\n"
                    await self._handle_tool_failure(step, str(e), tool_call, execution)
                    yield f"data: {json.dumps({'event': 'fallback_triggered', 'tool': step, 'reason': 'error'})}\n\n"
                    result = await self._handle_fallback(step, context, execution)
                    trace['steps'].append(result)
                    
            except Exception as e:
                logger.error(f"Error executing step {step}: {str(e)}")
                yield f"data: {json.dumps({'event': 'tool_update', 'tool': step, 'status': 'error', 'error': str(e)})}\n\n"
                trace['steps'].append({
                    'step': step,
                    'status': 'error',
                    'error': str(e)
                })
        
        trace['end_time'] = datetime.now().isoformat()
        trace['final_result'] = context.get('final_result', {})
        
        # Save trace to execution record
        execution.trace = trace
        execution.save()
    
    async def _execute_plan(self, plan: List[str], context: Dict[str, Any], 
                          execution: AgentExecution) -> Dict[str, Any]:
        """
        Execute the agent plan step by step.
        """
        trace = {
            'steps': [],
            'start_time': datetime.now().isoformat(),
            'context': context
        }
        
        for step in plan:
            try:
                # Check circuit breaker
                if self._is_circuit_breaker_open(step):
                    logger.warning(f"Circuit breaker open for {step}, using fallback")
                    result = await self._handle_fallback(step, context, execution)
                    trace['steps'].append(result)
                    continue
                
                # Execute tool
                tool = self.tools[step]
                tool_call = ToolCall.objects.create(
                    execution=execution,
                    tool_name=step,
                    input_data=context,
                    status='PENDING'
                )
                
                start_time = time.time()
                
                try:
                    # Execute with timeout
                    result = await asyncio.wait_for(
                        tool.execute(context),
                        timeout=settings.TOOL_TIMEOUT
                    )
                    
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    # Update tool call
                    tool_call.status = 'SUCCESS'
                    tool_call.output_data = result
                    tool_call.completed_at = datetime.now()
                    tool_call.duration_ms = duration_ms
                    tool_call.save()
                    
                    # Update context with result
                    context.update(result)
                    
                    # Reset circuit breaker on success
                    self._reset_circuit_breaker(step)
                    
                    trace['steps'].append({
                        'step': step,
                        'status': 'success',
                        'duration_ms': duration_ms,
                        'result': result
                    })
                    
                except asyncio.TimeoutError:
                    logger.error(f"Tool {step} timed out")
                    await self._handle_tool_failure(step, "timeout", tool_call, execution)
                    result = await self._handle_fallback(step, context, execution)
                    trace['steps'].append(result)
                    
                except Exception as e:
                    logger.error(f"Tool {step} failed: {str(e)}")
                    await self._handle_tool_failure(step, str(e), tool_call, execution)
                    result = await self._handle_fallback(step, context, execution)
                    trace['steps'].append(result)
                    
            except Exception as e:
                logger.error(f"Error executing step {step}: {str(e)}")
                trace['steps'].append({
                    'step': step,
                    'status': 'error',
                    'error': str(e)
                })
        
        trace['end_time'] = datetime.now().isoformat()
        trace['final_result'] = context.get('final_result', {})
        
        # Save trace to execution record
        execution.trace = trace
        execution.save()
    
    async def _handle_tool_failure(self, tool_name: str, error: str, 
                                 tool_call: ToolCall, execution: AgentExecution):
        """
        Handle tool failure and update circuit breaker.
        """
        # Update tool call
        tool_call.status = 'ERROR'
        tool_call.error_message = error
        tool_call.completed_at = datetime.now()
        tool_call.save()
        
        # Update circuit breaker
        self._record_failure(tool_name)
    
    async def _handle_fallback(self, tool_name: str, context: Dict[str, Any], 
                             execution: AgentExecution) -> Dict[str, Any]:
        """
        Handle fallback when tool fails.
        """
        fallback_result = await self.fallback_manager.get_fallback(tool_name, context)
        
        # Record fallback
        AgentFallback.objects.create(
            execution=execution,
            tool_name=tool_name,
            fallback_reason=f"Tool {tool_name} failed",
            fallback_data=fallback_result
        )
        
        return {
            'step': tool_name,
            'status': 'fallback',
            'fallback_used': True,
            'result': fallback_result
        }
    
    def _is_circuit_breaker_open(self, tool_name: str) -> bool:
        """
        Check if circuit breaker is open for a tool.
        """
        if tool_name not in self.circuit_breakers:
            return False
        
        breaker = self.circuit_breakers[tool_name]
        if breaker['failures'] >= settings.CIRCUIT_BREAKER_THRESHOLD:
            # Check if timeout has passed
            if time.time() - breaker['last_failure'] < settings.CIRCUIT_BREAKER_TIMEOUT:
                return True
            else:
                # Reset circuit breaker
                self._reset_circuit_breaker(tool_name)
        
        return False
    
    def _record_failure(self, tool_name: str):
        """
        Record a failure for circuit breaker.
        """
        if tool_name not in self.circuit_breakers:
            self.circuit_breakers[tool_name] = {
                'failures': 0,
                'last_failure': 0
            }
        
        self.circuit_breakers[tool_name]['failures'] += 1
        self.circuit_breakers[tool_name]['last_failure'] = time.time()
    
    def _reset_circuit_breaker(self, tool_name: str):
        """
        Reset circuit breaker for a tool.
        """
        if tool_name in self.circuit_breakers:
            self.circuit_breakers[tool_name]['failures'] = 0
            self.circuit_breakers[tool_name]['last_failure'] = 0
