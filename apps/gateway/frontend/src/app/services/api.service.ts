import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Customer {
  id: string;
  name: string;
  email_masked: string;
  risk_flags: string[];
}

export interface Transaction {
  id: string;
  customerId: string;
  cardId: string;
  mcc: string;
  merchant: string;
  amount: number;
  currency: string;
  timestamp: string;
  deviceId: string;
  geo_lat: number;
  geo_lon: number;
  geo_country: string;
}

export interface FraudAlert {
  id: string;
  customerId: string;
  customerName: string;
  transactionId: string;
  cardId: string;
  merchant: string;
  amount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved';
  actionTaken?: string;
  createdAt: string;
  reasons: string[];
}

export interface TriageResult {
  execution_id: string;
  status: string;
  duration_ms: number;
  result: {
    action: string;
    risk_level: string;
    reasons: string[];
    otp_required: boolean;
    citations: string[];
    message: string;
  };
  trace: any;
}

export interface KPIData {
  totalSpend: number;
  highRiskAlerts: number;
  disputesOpened: number;
  avgTriageTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_BASE_URL = 'http://localhost:8000/api';
  private readonly API_KEY = 'aegis-api-key-2024';
  
  private headers = new HttpHeaders({
    'X-API-Key': this.API_KEY
  });
  
  private jsonHeaders = new HttpHeaders({
    'X-API-Key': this.API_KEY,
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  // Upload API
  uploadTransactions(formData: FormData): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/ingest/transactions`, formData, {
      headers: {
        'X-API-Key': this.API_KEY
      }
    });
  }

  // Customer and Transaction APIs
  getCustomerTransactions(customerId: string, page: number = 1, size: number = 50): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/customer/${customerId}/transactions?page=${page}&size=${size}`, { headers: this.headers });
  }

  getCustomerInsights(customerId: string): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/insights/${customerId}/summary`, { headers: this.headers });
  }

  getFraudAlerts(): Observable<FraudAlert[]> {
    const timestamp = new Date().getTime();
    return this.http.get<FraudAlert[]>(`${this.API_BASE_URL}/alerts?t=${timestamp}`, { headers: this.headers });
  }

  getKPIs(): Observable<KPIData> {
    const timestamp = new Date().getTime();
    return this.http.get<KPIData>(`${this.API_BASE_URL}/metrics?t=${timestamp}`, { headers: this.headers });
  }

  // Evaluations API
  getEvalCases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE_URL}/evals/cases`, { headers: this.headers });
  }

  runEvalCase(caseId: string): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/evals/run`, { caseId }, { headers: this.jsonHeaders });
  }

  runAllEvals(): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/evals/run-all`, {}, { headers: this.jsonHeaders });
  }

  // Fraud Triage APIs
  triageFraud(customerId: string, suspectTxnId: string, userMessage: string = ''): Observable<TriageResult> {
    const body = {
      customerId,
      suspectTxnId,
      userMessage
    };
    
    return this.http.post<TriageResult>(`${this.API_BASE_URL}/triage/`, body, { headers: this.jsonHeaders });
  }

  triageFraudStream(customerId: string, suspectTxnId: string, userMessage: string = ''): Observable<any> {
    const body = {
      customerId,
      suspectTxnId,
      userMessage
    };
    
    return this.http.post(`${this.API_BASE_URL}/triage/stream`, body, { 
      headers: this.headers,
      responseType: 'text'
    });
  }

  // Action APIs
  freezeCard(cardId: string, otp?: string): Observable<any> {
    const body = { cardId, otp };
    return this.http.post(`${this.API_BASE_URL}/action/freeze-card`, body, { headers: this.headers });
  }

  unfreezeCard(cardId: string): Observable<any> {
    const body = { cardId };
    return this.http.post(`${this.API_BASE_URL}/action/unfreeze-card`, body, { headers: this.headers });
  }

  openDispute(txnId: string, reasonCode: string, confirm: boolean = true): Observable<any> {
    const body = { txnId, reasonCode, confirm };
    return this.http.post(`${this.API_BASE_URL}/action/open-dispute`, body, { headers: this.headers });
  }

  contactCustomer(customerId: string, message: string): Observable<any> {
    const body = { customerId, message };
    return this.http.post(`${this.API_BASE_URL}/action/contact-customer`, body, { headers: this.headers });
  }

  // Knowledge Base API
  searchKB(query: string): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/kb/search?q=${encodeURIComponent(query)}`, { headers: this.headers });
  }

  // Evaluation API
  getEvalResults(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/evals/results`, { headers: this.headers });
  }

  runAllEvaluations(): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/evals/run`, {}, { headers: this.jsonHeaders });
  }

  runEvaluations(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/evals/run`, { headers: this.headers });
  }

  // Mock data for dashboard (until we implement real fraud alerts)
  getMockFraudAlerts(): Observable<FraudAlert[]> {
    return new Observable(observer => {
      const alerts: FraudAlert[] = [
        {
          id: 'alert_001',
          customerId: 'cust_017',
          customerName: 'Kiran Verma',
          transactionId: 'txn_01001',
          cardId: 'card_093',
          merchant: 'ATM Withdrawal',
          amount: 10000,
          riskScore: 85,
          riskLevel: 'high',
          status: 'pending',
          createdAt: '2025-01-18T10:30:00Z',
          reasons: ['card_lost', 'customer_request']
        },
        {
          id: 'alert_002',
          customerId: 'cust_017',
          customerName: 'Kiran Verma',
          transactionId: 'txn_01002',
          cardId: 'card_093',
          merchant: 'ABC Mart',
          amount: 499900,
          riskScore: 75,
          riskLevel: 'high',
          status: 'in_progress',
          createdAt: '2025-01-18T09:15:00Z',
          reasons: ['unauthorized_transaction', 'customer_dispute']
        },
        {
          id: 'alert_003',
          customerId: 'cust_001',
          customerName: 'Rajesh Kumar',
          transactionId: 'txn_01003',
          cardId: 'card_001',
          merchant: 'QuickCab',
          amount: 25000,
          riskScore: 25,
          riskLevel: 'low',
          status: 'resolved',
          createdAt: '2025-01-18T08:45:00Z',
          reasons: ['duplicate_explanation']
        }
      ];
      
      setTimeout(() => observer.next(alerts), 100);
    });
  }

  getMockKPIs(): Observable<KPIData> {
    return new Observable(observer => {
      const kpis: KPIData = {
        totalSpend: 1250000,
        highRiskAlerts: 23,
        disputesOpened: 8,
        avgTriageTime: 2.3
      };
      
      setTimeout(() => observer.next(kpis), 100);
    });
  }
}
