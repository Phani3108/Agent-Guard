import { Component, OnInit } from '@angular/core';
import { ApiService, FraudAlert, KPIData } from '../services/api.service';

interface DashboardKPI {
  totalSpend: number;
  highRiskAlerts: number;
  disputesOpened: number;
  avgTriageTime: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  kpis: DashboardKPI = {
    totalSpend: 0,
    highRiskAlerts: 0,
    disputesOpened: 0,
    avgTriageTime: 0
  };

  fraudAlerts: FraudAlert[] = [];
  displayedColumns: string[] = ['customer', 'transaction', 'risk', 'status', 'actions'];
  pageSize = 25;
  totalAlerts = 0;
  selectedAlert: FraudAlert | null = null;
  showTriageDrawer = false;

  filters = {
    dateRange: '30',
    merchant: '',
    category: 'all',
    riskLevel: 'all'
  };
  
  uploadStatus: string = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadKPIs();
    this.loadAlerts();
  }

  loadKPIs(): void {
    // Try real API first, fallback to mock data
    this.apiService.getKPIs().subscribe({
      next: (kpis: KPIData) => {
        console.log('KPIs loaded from API:', kpis);
        this.kpis = kpis;
      },
      error: (error: any) => {
        console.error('Error loading KPIs:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        // Set default values instead of mock data to see the real issue
        this.kpis = {
          totalSpend: 0,
          highRiskAlerts: 0,
          disputesOpened: 0,
          avgTriageTime: 0
        };
      }
    });
  }

  loadAlerts(): void {
    // Try real API first, fallback to mock data
    this.apiService.getFraudAlerts().subscribe({
      next: (alerts: FraudAlert[]) => {
        this.fraudAlerts = alerts;
        this.totalAlerts = alerts.length;
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
        console.error('Alerts error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        // Set empty array instead of mock data to see the real issue
        this.fraudAlerts = [];
        this.totalAlerts = 0;
      }
    });
  }

  applyFilters(): void {
    // Apply filters and reload data
    this.loadAlerts();
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    // Load data for new page
    this.loadAlerts();
  }

  openTriage(alert: FraudAlert): void {
    this.selectedAlert = alert;
    this.showTriageDrawer = true;
    
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

  openTriageDrawer(alert: FraudAlert): void {
    this.selectedAlert = alert;
    this.showTriageDrawer = true;
  }

  closeTriageDrawer(): void {
    this.showTriageDrawer = false;
    this.selectedAlert = null;
  }

  viewCustomer(customerId: string): void {
    // Navigate to customer page
    window.open(`/customer/${customerId}`, '_blank');
  }

  refreshData(): void {
    console.log('Manual refresh triggered...');
    this.loadKPIs();
    this.loadAlerts();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadStatus = 'Uploading...';
      this.uploadTransactions(file);
    }
  }

  uploadTransactions(file: File): void {
    const formData = new FormData();
    formData.append('file', file);
    
    this.uploadStatus = 'Uploading...';
    
    // Upload to backend
    this.apiService.uploadTransactions(formData).subscribe({
      next: (response) => {
        this.uploadStatus = 'Upload successful!';
        console.log('Upload response:', response);
        
        // Refresh data immediately after successful upload
        this.uploadStatus = 'Upload successful! Refreshing data...';
        console.log('Refreshing data after upload...');
        this.loadKPIs();
        this.loadAlerts();
        
        // Clear status after 3 seconds
        setTimeout(() => {
          this.uploadStatus = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.uploadStatus = 'Upload failed: ' + (error.error?.message || error.message);
        
        setTimeout(() => {
          this.uploadStatus = '';
        }, 3000);
      }
    });
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
}
