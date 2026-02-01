from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse
import json
import asyncio
import logging
from .orchestrator import AgentOrchestrator
from .models import AgentExecution
from .redactor import PIIRedactor
from apps.core.authentication import APIKeyAuthentication
from agentguard_contracts.decision import Decision, DecisionAction, Redaction as RedactionModel

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def triage_fraud(request):
    """
    Start fraud triage process with streaming updates.
    """
    try:
        customer_id = request.data.get('customerId')
        suspect_txn_id = request.data.get('suspectTxnId')
        user_message = request.data.get('userMessage', '')
        
        if not customer_id or not suspect_txn_id:
            return Response(
                {'error': 'customerId and suspectTxnId are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create orchestrator and start execution
        orchestrator = AgentOrchestrator()
        
        # Run async execution
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                orchestrator.execute_triage(customer_id, suspect_txn_id, user_message)
            )
            
            return Response(result)
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error(f"Error in triage_fraud: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def triage_fraud_stream(request):
    """
    Start fraud triage process with Server-Sent Events streaming.
    """
    try:
        customer_id = request.data.get('customerId')
        suspect_txn_id = request.data.get('suspectTxnId')
        user_message = request.data.get('userMessage', '')
        
        if not customer_id or not suspect_txn_id:
            return Response(
                {'error': 'customerId and suspectTxnId are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        def event_stream():
            """Generate SSE events for triage progress."""
            try:
                # Send initial event
                yield f"data: {json.dumps({'event': 'plan_built', 'message': 'Starting fraud triage analysis'})}\n\n"
                
                # Create orchestrator
                orchestrator = AgentOrchestrator()
                
                # Run async execution with progress updates
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    # Execute the async generator
                    async_gen = orchestrator.execute_triage_with_progress(
                        customer_id, suspect_txn_id, user_message, event_stream
                    )
                    
                    # Consume the async generator using asyncio
                    while True:
                        try:
                            event = loop.run_until_complete(async_gen.__anext__())
                            yield event
                        except StopAsyncIteration:
                            break
                    
                finally:
                    loop.close()
                    
            except Exception as e:
                logger.error(f"Error in event_stream: {str(e)}")
                yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"
        
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Headers'] = 'Cache-Control'
        
        return response
        
    except Exception as e:
        logger.error(f"Error in triage_fraud_stream: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_execution_status(request, execution_id):
    """
    Get status of agent execution.
    """
    try:
        execution = AgentExecution.objects.get(id=execution_id)
        
        return Response({
            'execution_id': execution.id,
            'status': execution.status,
            'execution_type': execution.execution_type,
            'started_at': execution.started_at.isoformat(),
            'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
            'duration_ms': execution.duration_ms,
            'result': execution.result
        })
        
    except AgentExecution.DoesNotExist:
        return Response(
            {'error': 'Execution not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in get_execution_status: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_execution_trace(request, execution_id):
    """
    Get detailed trace of agent execution.
    """
    try:
        execution = AgentExecution.objects.get(id=execution_id)
        
        return Response({
            'execution_id': execution.id,
            'trace': execution.trace,
            'plan': execution.plan
        })
        
    except AgentExecution.DoesNotExist:
        return Response(
            {'error': 'Execution not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in get_execution_trace: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def inspect_safety(request):
    """
    Inspect text or payload for safety (PII detection, policy compliance).
    Conforms to AgentGuard Decision contract.
    """
    try:
        tenant_id = request.data.get('tenant_id', 'default')
        request_id = request.data.get('request_id', 'unknown')
        text = request.data.get('text')
        payload = request.data.get('payload')
        
        redactor = PIIRedactor()
        findings = []
        redactions = []
        action = DecisionAction.ALLOW
        
        if text:
            # Detect PII
            detected_types = redactor.get_pii_types(text)
            if detected_types:
                action = DecisionAction.REDACT
                for pii_type in detected_types:
                    pattern = redactor.patterns[pii_type]
                    for match in pattern.finditer(text):
                        redactions.append(
                            RedactionModel(
                                type=pii_type,
                                replacement=redactor.replacements[pii_type],
                                start=match.start(),
                                end=match.end()
                            )
                        )
                findings.append(f"PII detected: {', '.join(detected_types)}")

        # Build decision
        decision_dict = {
            "request_id": request_id,
            "tenant_id": tenant_id,
            "action": action,
            "reasons": findings,
            "redactions": [r.model_dump() for r in redactions],
            "allowed_tools": [],
            "requires_approval": False
        }
        
        # Validate against Pydantic contract
        validated_decision = Decision.model_validate(decision_dict)
        
        return Response(validated_decision.model_dump())
        
    except Exception as e:
        logger.error(f"Error in inspect_safety: {str(e)}")
        return Response(
            {'error': 'Safety inspection failed', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )