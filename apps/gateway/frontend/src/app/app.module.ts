import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CustomerComponent } from './customer/customer.component';
import { TriageDrawerComponent } from './triage-drawer/triage-drawer.component';
import { AlertsComponent } from './alerts/alerts.component';
import { EvalsComponent } from './evals/evals.component';
import { ApiService } from './services/api.service';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    CustomerComponent,
    TriageDrawerComponent,
    AlertsComponent,
    EvalsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }