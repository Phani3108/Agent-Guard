import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { ApiService, FraudAlert, TriageResult } from '../services/api.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-triage-drawer',
  templateUrl: './triage-drawer.component.html',
  styleUrls: ['./triage-drawer.component.scss']
})
export class TriageDrawerComponent implements OnInit, OnDestroy {
  @Input() alert: FraudAlert | null = null;
  @Input() isOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  
  triageResult: TriageResult | null = null;
  isProcessing = false;
  progressSteps: any[] = [];
  currentStep = 0;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.alert && this.isOpen) {
      this.startTriage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startTriage(): void {
    if (!this.alert) return;

    this.isProcessing = true;
    this.error = null;
    this.progressSteps = [];
    this.currentStep = 0;

    // Initialize progress steps
    this.progressSteps = [
      { name: 'getProfile', status: 'pending', result: null },
      { name: 'getRecentTransactions', status: 'pending', result: null },
      { name: 'riskSignals', status: 'pending', result: null },
      { name: 'kbLookup', status: 'pending', result: null },
      { name: 'decide', status: 'pending', result: null },
      { name: 'proposeAction', status: 'pending', result: null }
    ];

    // Start triage with streaming updates
    this.apiService.triageFraudStream(
      this.alert.customerId, 
      this.alert.transactionId, 
      'Customer reported suspicious activity'
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.handleStreamResponse(response);
      },
      error: (error) => {
        console.error('Triage stream error:', error);
        this.error = 'Failed to process triage request';
        this.isProcessing = false;
      }
    });
  }

  private handleStreamResponse(response: string): void {
    try {
      // Parse SSE data
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
          this.handleStreamEvent(data);
        }
      }
    } catch (error) {
      console.error('Error parsing stream response:', error);
    }
  }

  private handleStreamEvent(event: any): void {
    switch (event.event) {
      case 'plan_built':
        console.log('Plan built:', event.plan);
        break;
        
      case 'tool_update':
        this.updateToolStatus(event.tool, event.status, event.result);
        break;
        
      case 'fallback_triggered':
        this.updateToolStatus(event.tool, 'fallback', event.fallback_result);
        break;
        
      case 'decision_finalized':
        this.triageResult = event.result;
        this.isProcessing = false;
        break;
        
      case 'error':
        this.error = event.error;
        this.isProcessing = false;
        break;
    }
  }

  private updateToolStatus(toolName: string, status: string, result?: any): void {
    const stepIndex = this.progressSteps.findIndex(step => step.name === toolName);
    if (stepIndex !== -1) {
      this.progressSteps[stepIndex].status = status;
      this.progressSteps[stepIndex].result = result;
      
      if (status === 'completed' || status === 'fallback') {
        this.currentStep = Math.max(this.currentStep, stepIndex + 1);
      }
    }
  }

  getStepIcon(step: any): string {
    switch (step.status) {
      case 'completed': return 'fa-check-circle text-success';
      case 'failed': return 'fa-times-circle text-danger';
      case 'fallback': return 'fa-exclamation-triangle text-warning';
      case 'started': return 'fa-hourglass-half text-info';
      default: return 'fa-circle text-muted';
    }
  }

  getStepTextClass(status: string): string {
    switch (status) {
      case 'completed': return 'text-success';
      case 'failed': return 'text-danger';
      case 'fallback': return 'text-warning';
      case 'started': return 'text-info';
      default: return 'text-muted';
    }
  }

  getRiskBadgeClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      default: return 'secondary';
    }
  }

  getStepIconName(step: any): string {
    switch (step.name) {
      case 'getProfile': return 'person';
      case 'getRecentTransactions': return 'history';
      case 'riskSignals': return 'warning';
      case 'kbLookup': return 'search';
      case 'decide': return 'psychology';
      case 'proposeAction': return 'recommend';
      default: return 'help';
    }
  }


  executeAction(action: string): void {
    if (!this.alert || !this.triageResult) return;

    switch (action) {
      case 'FREEZE_CARD':
        this.apiService.freezeCard(this.alert.cardId).subscribe({
          next: (result) => {
            console.log('Card frozen:', result);
            this.alert!.status = 'resolved';
          },
          error: (error) => {
            console.error('Error freezing card:', error);
          }
        });
        break;
        
      case 'OPEN_DISPUTE':
        this.apiService.openDispute(this.alert.transactionId, '10.4').subscribe({
          next: (result) => {
            console.log('Dispute opened:', result);
            this.alert!.status = 'resolved';
          },
          error: (error) => {
            console.error('Error opening dispute:', error);
          }
        });
        break;
        
      case 'CONTACT_CUSTOMER':
        this.apiService.contactCustomer(this.alert.customerId, 'Please verify this transaction').subscribe({
          next: (result) => {
            console.log('Customer contacted:', result);
            this.alert!.status = 'in_progress';
          },
          error: (error) => {
            console.error('Error contacting customer:', error);
          }
        });
        break;
    }
  }

  close(): void {
    this.closed.emit();
  }
}