import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';

interface EvalCase {
  id: string;
  name: string;
  description: string;
  expectedOutcome: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  duration?: number;
  evaluation?: any;
  error?: string;
}

interface EvalSummary {
  total_cases: number;
  passed: number;
  failed: number;
  success_rate: number;
  avg_latency_ms: number;
  fallback_rate: number;
}

interface EvalResults {
  last_run: string;
  summary: EvalSummary;
  confusion_matrix: any;
  results?: EvalCase[];
}

@Component({
  selector: 'app-evals',
  templateUrl: './evals.component.html',
  styleUrls: ['./evals.component.scss']
})
export class EvalsComponent implements OnInit {
  evalCases: EvalCase[] = [];
  evalSummary: EvalSummary | null = null;
  evalResults: EvalResults | null = null;
  loading = false;
  running = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadEvalResults();
  }

  loadEvalResults(): void {
    this.loading = true;
    this.error = null;
    
    this.apiService.getEvalResults().subscribe({
      next: (results: EvalResults) => {
        this.evalResults = results;
        this.evalSummary = results.summary;
        
        // Load predefined test cases
        this.loadTestCases();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading eval results:', error);
        this.error = 'Failed to load evaluation results';
        this.loading = false;
      }
    });
  }

  loadTestCases(): void {
    // Load the 12 predefined test cases
    this.evalCases = [
      {
        id: 'case_001',
        name: 'Card Lost - Freeze with OTP',
        description: 'Customer reports lost card, system should freeze card after OTP verification',
        expectedOutcome: 'FREEZE_CARD',
        status: 'pending'
      },
      {
        id: 'case_002', 
        name: 'Unauthorized Charge - Open Dispute',
        description: 'Customer reports unauthorized charge, system should open dispute with reason 10.4',
        expectedOutcome: 'OPEN_DISPUTE',
        status: 'pending'
      },
      {
        id: 'case_003',
        name: 'Duplicate Transaction - Explanation Only',
        description: 'Customer reports duplicate charge, system should explain preauth vs capture without opening dispute',
        expectedOutcome: 'EXPLAIN_ONLY',
        status: 'pending'
      },
      {
        id: 'case_004',
        name: 'Geo Velocity - Contact Customer',
        description: 'Transaction from unusual geographic location, system should contact customer for verification',
        expectedOutcome: 'CONTACT_CUSTOMER',
        status: 'pending'
      },
      {
        id: 'case_005',
        name: 'Device Change - Freeze Card',
        description: 'Transaction from new device, system should freeze card for security',
        expectedOutcome: 'FREEZE_CARD',
        status: 'pending'
      },
      {
        id: 'case_006',
        name: 'Chargeback History - Escalate Case',
        description: 'Customer with multiple chargebacks, system should escalate for manual review',
        expectedOutcome: 'ESCALATE_CASE',
        status: 'pending'
      },
      {
        id: 'case_007',
        name: 'Risk Timeout - Fallback',
        description: 'Risk assessment times out, system should use fallback mechanism',
        expectedOutcome: 'FALLBACK',
        status: 'pending'
      },
      {
        id: 'case_008',
        name: 'Rate Limit - Block Request',
        description: 'Too many requests, system should rate limit and block',
        expectedOutcome: 'RATE_LIMITED',
        status: 'pending'
      },
      {
        id: 'case_009',
        name: 'Policy Block - Deny Action',
        description: 'Action violates policy, system should block and deny',
        expectedOutcome: 'BLOCKED',
        status: 'pending'
      },
      {
        id: 'case_010',
        name: 'PII Redaction - Mask Data',
        description: 'System should redact PII data in responses',
        expectedOutcome: 'PII_REDACTED',
        status: 'pending'
      },
      {
        id: 'case_011',
        name: 'KB FAQ - Provide Answer',
        description: 'Customer asks FAQ question, system should provide knowledge base answer',
        expectedOutcome: 'KB_ANSWER',
        status: 'pending'
      },
      {
        id: 'case_012',
        name: 'Ambiguous Merchant - Contact Customer',
        description: 'Merchant name unclear, system should contact customer for clarification',
        expectedOutcome: 'CONTACT_CUSTOMER',
        status: 'pending'
      }
    ];
  }

  runAllEvaluations(): void {
    this.running = true;
    this.error = null;
    
    // Update all cases to running
    this.evalCases.forEach(case_ => {
      case_.status = 'running';
    });
    
    // Call the real evaluation API
    this.apiService.runAllEvaluations().subscribe({
      next: (response) => {
        console.log('Evaluation results:', response);
        
        // Update cases with results
        if (response.results) {
          response.results.forEach((result: any) => {
            const case_ = this.evalCases.find(c => c.id === result.case_id);
            if (case_) {
              case_.status = result.status === 'passed' ? 'completed' : 'failed';
              case_.result = result.actual;
              case_.evaluation = result.evaluation;
              case_.duration = result.actual?.duration_ms;
              if (result.status === 'failed') {
                case_.error = result.evaluation?.errors?.join(', ') || 'Test failed';
              }
            }
          });
        }
        
        // Update summary
        this.evalSummary = response.summary;
        this.running = false;
      },
      error: (error) => {
        console.error('Error running evaluations:', error);
        this.error = 'Failed to run evaluations: ' + (error.error?.message || error.message);
        
        // Reset cases to pending
        this.evalCases.forEach(case_ => {
          case_.status = 'pending';
        });
        this.running = false;
      }
    });
  }

  runSingleEvaluation(case_: EvalCase): void {
    case_.status = 'running';
    
    // For single evaluation, we'll just run all evaluations
    // In a real implementation, you'd have a single case API endpoint
    this.runAllEvaluations();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'secondary';
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'fa-clock';
      case 'running': return 'fa-spinner fa-spin';
      case 'completed': return 'fa-check-circle';
      case 'failed': return 'fa-times-circle';
      default: return 'fa-question-circle';
    }
  }
}
