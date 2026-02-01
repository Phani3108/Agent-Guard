import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface Transaction {
  id: string;
  customerId: string;
  cardId: string;
  mcc: string;
  merchant: string;
  amount: number;
  currency: string;
  timestamp: string;
  deviceId: string;
  geo: {
    lat: number;
    lon: number;
    country: string;
  };
  status: string;
}

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.scss']
})
export class CustomerComponent implements OnInit {
  customer: Customer | null = null;
  transactions: Transaction[] = [];
  loading = true;
  error: string | null = null;

  private apiUrl = 'http://localhost:8000/api';
  private headers = new HttpHeaders({
    'X-API-Key': 'aegis-api-key-2024',
    'Content-Type': 'application/json'
  });

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const customerId = params['id'];
      if (customerId) {
        this.loadCustomer(customerId);
        this.loadTransactions(customerId);
      }
    });
  }

  loadCustomer(customerId: string): void {
    this.http.get<any>(`${this.apiUrl}/customer/${customerId}`, { headers: this.headers })
      .subscribe({
        next: (response) => {
          this.customer = {
            id: response.id,
            name: response.name,
            email: response.email_masked || 'N/A',
            phone: response.phone || 'N/A',
            status: response.status || 'active'
          };
        },
        error: (error) => {
          console.error('Error loading customer:', error);
          this.error = 'Failed to load customer data';
          this.loading = false;
        }
      });
  }

  loadTransactions(customerId: string): void {
    this.http.get<any>(`${this.apiUrl}/customer/${customerId}/transactions`, { headers: this.headers })
      .subscribe({
        next: (response) => {
          this.transactions = response.transactions || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading transactions:', error);
          this.error = 'Failed to load transaction data';
          this.loading = false;
        }
      });
  }
}