import { Component, OnInit } from '@angular/core';
import { ApiService, FraudAlert } from '../services/api.service';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss']
})
export class AlertsComponent implements OnInit {
  alerts: FraudAlert[] = [];
  loading = false;
  error: string | null = null;
  
  // Filters
  filters = {
    status: 'all',
    riskLevel: 'all',
    dateRange: '7'
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.error = null;
    
    // Try real API first, fallback to mock data
    this.apiService.getFraudAlerts().subscribe({
      next: (alerts: FraudAlert[]) => {
        this.alerts = this.applyFilters(alerts);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading alerts:', error);
        // Fallback to mock data
        this.apiService.getMockFraudAlerts().subscribe({
          next: (alerts: FraudAlert[]) => {
            this.alerts = this.applyFilters(alerts);
            this.loading = false;
          },
          error: (fallbackError: any) => {
            this.error = 'Failed to load alerts';
            this.loading = false;
          }
        });
      }
    });
  }

  applyFilters(alerts: FraudAlert[]): FraudAlert[] {
    let filtered = [...alerts];
    
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(alert => alert.status === this.filters.status);
    }
    
    if (this.filters.riskLevel !== 'all') {
      filtered = filtered.filter(alert => alert.riskLevel === this.filters.riskLevel);
    }
    
    return filtered;
  }

  onFilterChange(): void {
    this.loadAlerts();
  }

  getRiskBadgeClass(riskLevel: string): string {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'resolved': return 'success';
      default: return 'secondary';
    }
  }

  getActionDisplayName(action: string): string {
    switch (action) {
      case 'FREEZE_CARD': return 'Card Frozen';
      case 'OPEN_DISPUTE': return 'Dispute Opened';
      case 'CONTACT_CUSTOMER': return 'Customer Contacted';
      case 'ESCALATE_CASE': return 'Case Escalated';
      case 'EXPLAIN_ONLY': return 'Explanation Provided';
      default: return action;
    }
  }

  getActionDescription(action: string): string {
    switch (action) {
      case 'FREEZE_CARD': return 'Card has been frozen to prevent unauthorized transactions';
      case 'OPEN_DISPUTE': return 'Dispute has been opened for unauthorized transaction';
      case 'CONTACT_CUSTOMER': return 'Customer is being contacted for verification';
      case 'ESCALATE_CASE': return 'Case has been escalated for manual review';
      case 'EXPLAIN_ONLY': return 'Explanation has been provided to customer';
      default: return 'Action completed';
    }
  }

  openTriage(alert: FraudAlert): void {
    // Start real triage process
    console.log('Starting triage for alert:', alert);
    this.apiService.triageFraud(alert.customerId, alert.transactionId, 'Customer reported suspicious activity').subscribe({
      next: (result) => {
        console.log('Triage result:', result);
        // Update alert status based on result
        alert.status = 'in_progress';
        // Refresh the alerts to get updated status from backend
        this.loadAlerts();
      },
      error: (error) => {
        console.error('Error in triage:', error);
        alert.status = 'pending'; // Reset status on error
      }
    });
  }
}
