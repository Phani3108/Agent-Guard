from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json
import os
import logging
from pathlib import Path
from .orchestrator import AgentOrchestrator
from apps.core.authentication import APIKeyAuthentication

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def run_evals(request):
    """
    Run evaluation tests against golden test cases.
    """
    try:
        # Load test cases
        fixtures_dir = Path("/app/fixtures/evals")
        test_cases = []
        
        for case_file in fixtures_dir.glob("*.json"):
            with open(case_file) as f:
                test_case = json.load(f)
                test_cases.append(test_case)
        
        if not test_cases:
            return Response(
                {'error': 'No test cases found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Run evaluations
        results = []
        orchestrator = AgentOrchestrator()
        
        for test_case in test_cases:
            try:
                # Run the test case
                result = run_single_eval(orchestrator, test_case)
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error running test case {test_case['id']}: {str(e)}")
                results.append({
                    'case_id': test_case['id'],
                    'status': 'failed',
                    'error': str(e)
                })
        
        # Calculate summary metrics
        summary = calculate_eval_summary(results)
        
        return Response({
            'summary': summary,
            'results': results,
            'total_cases': len(test_cases)
        })
        
    except Exception as e:
        logger.error(f"Error in run_evals: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_eval_results(request):
    """
    Get evaluation results and metrics.
    """
    try:
        # This would typically load from database
        # For now, return mock results
        return Response({
            'last_run': '2025-01-18T10:00:00Z',
            'summary': {
                'total_cases': 12,
                'passed': 10,
                'failed': 2,
                'success_rate': 83.3,
                'avg_latency_ms': 1250,
                'fallback_rate': 8.3
            },
            'confusion_matrix': {
                'low_risk': {'correct': 4, 'incorrect': 0},
                'medium_risk': {'correct': 3, 'incorrect': 1},
                'high_risk': {'correct': 3, 'incorrect': 1}
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_eval_results: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def run_single_eval(orchestrator, test_case):
    """
    Run a single evaluation test case.
    """
    case_id = test_case['id']
    input_data = test_case['input']
    expected = test_case['expected']
    
    # Extract input parameters
    customer_id = input_data['customerId']
    suspect_txn_id = input_data.get('suspectTxnId')
    user_message = input_data.get('userMessage', '')
    
    # Simulate failures if specified
    if test_case.get('simulateFailure'):
        # This would be implemented to simulate tool failures
        pass
    
    if test_case.get('simulateRateLimit'):
        # This would be implemented to simulate rate limiting
        pass
    
    # Run the orchestrator
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        result = loop.run_until_complete(
            orchestrator.execute_triage(customer_id, suspect_txn_id, user_message)
        )
        
        # Evaluate results
        evaluation = evaluate_result(result, expected, test_case)
        
        return {
            'case_id': case_id,
            'name': test_case['name'],
            'status': evaluation['status'],
            'expected': expected,
            'actual': result,
            'evaluation': evaluation
        }
        
    finally:
        loop.close()


def evaluate_result(actual_result, expected, test_case):
    """
    Evaluate actual result against expected result.
    """
    evaluation = {
        'status': 'passed',
        'checks': [],
        'errors': []
    }
    
    try:
        # Check if execution completed successfully
        if actual_result['status'] != 'completed':
            evaluation['status'] = 'failed'
            evaluation['errors'].append(f"Execution failed: {actual_result.get('error', 'Unknown error')}")
            return evaluation
        
        result = actual_result.get('result', {})
        final_result = result.get('final_result', {})
        
        # Check action
        expected_action = expected.get('action')
        actual_action = final_result.get('action')
        
        if expected_action and actual_action != expected_action:
            evaluation['status'] = 'failed'
            evaluation['errors'].append(f"Action mismatch: expected {expected_action}, got {actual_action}")
        else:
            evaluation['checks'].append(f"Action correct: {actual_action}")
        
        # Check risk score
        expected_risk = expected.get('riskScore')
        actual_risk = final_result.get('risk_level')
        
        if expected_risk and actual_risk != expected_risk:
            evaluation['status'] = 'failed'
            evaluation['errors'].append(f"Risk score mismatch: expected {expected_risk}, got {actual_risk}")
        else:
            evaluation['checks'].append(f"Risk score correct: {actual_risk}")
        
        # Check OTP requirement
        expected_otp = expected.get('otpRequired')
        actual_otp = final_result.get('otp_required')
        
        if expected_otp is not None and actual_otp != expected_otp:
            evaluation['status'] = 'failed'
            evaluation['errors'].append(f"OTP requirement mismatch: expected {expected_otp}, got {actual_otp}")
        else:
            evaluation['checks'].append(f"OTP requirement correct: {actual_otp}")
        
        # Check fallback usage
        expected_fallback = expected.get('fallbackUsed')
        actual_fallback = final_result.get('fallback_used')
        
        if expected_fallback is not None and actual_fallback != expected_fallback:
            evaluation['status'] = 'failed'
            evaluation['errors'].append(f"Fallback usage mismatch: expected {expected_fallback}, got {actual_fallback}")
        else:
            evaluation['checks'].append(f"Fallback usage correct: {actual_fallback}")
        
        # Check specific test case requirements
        if test_case['id'] == 'case_010' and 'piiRedacted' in expected:
            # Check PII redaction
            if not result.get('pii_redacted'):
                evaluation['status'] = 'failed'
                evaluation['errors'].append("PII redaction not applied")
            else:
                evaluation['checks'].append("PII redaction applied correctly")
        
        if test_case['id'] == 'case_008' and 'retryAfterMs' in expected:
            # Check rate limiting
            if actual_result.get('status') != 'rate_limited':
                evaluation['status'] = 'failed'
                evaluation['errors'].append("Rate limiting not triggered")
            else:
                evaluation['checks'].append("Rate limiting triggered correctly")
        
    except Exception as e:
        evaluation['status'] = 'error'
        evaluation['errors'].append(f"Evaluation error: {str(e)}")
    
    return evaluation


def calculate_eval_summary(results):
    """
    Calculate summary metrics from evaluation results.
    """
    total_cases = len(results)
    passed_cases = sum(1 for r in results if r['status'] == 'passed')
    failed_cases = sum(1 for r in results if r['status'] == 'failed')
    
    success_rate = (passed_cases / total_cases * 100) if total_cases > 0 else 0
    
    # Calculate average latency
    latencies = [r['actual'].get('duration_ms', 0) for r in results if 'actual' in r]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    
    # Calculate fallback rate
    fallback_cases = sum(1 for r in results if r.get('actual', {}).get('fallback_used', False))
    fallback_rate = (fallback_cases / total_cases * 100) if total_cases > 0 else 0
    
    return {
        'total_cases': total_cases,
        'passed': passed_cases,
        'failed': failed_cases,
        'success_rate': round(success_rate, 1),
        'avg_latency_ms': round(avg_latency, 0),
        'fallback_rate': round(fallback_rate, 1)
    }
