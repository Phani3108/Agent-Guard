#!/usr/bin/env python3
import os
import sys
import django
import json
from datetime import datetime, timedelta

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aegis_support.settings')
django.setup()

from apps.customers.models import Customer, Card, Device
from apps.transactions.models import Transaction
from apps.insights.models import KnowledgeBaseDocument, SpendCategory

def create_test_data():
    print("Creating test data...")
    
    # Create customers
    customers = []
    for i in range(5):
        customer = Customer.objects.create(
            name=f"Test Customer {i+1}",
            email_masked=f"test{i+1}@example.com",
            risk_flags=["high_risk"] if i == 0 else []
        )
        customers.append(customer)
        print(f"Created customer: {customer.name}")
    
    # Create cards
    cards = []
    for i, customer in enumerate(customers):
        card = Card.objects.create(
            customer=customer,
            last4=f"123{i}",
            status="ACTIVE",
            network="VISA"
        )
        cards.append(card)
        print(f"Created card: {card.last4}")
    
    # Create devices
    devices = []
    for i, customer in enumerate(customers):
        device = Device.objects.create(
            customer=customer,
            device_type="mobile",
            is_trusted=True,
            last_seen=datetime.now() - timedelta(days=i)
        )
        devices.append(device)
        print(f"Created device: {device.id}")
    
    # Create transactions
    merchants = ["Grocery Store", "Restaurant", "Gas Station", "ATM", "Online Store"]
    for i in range(20):
        customer = customers[i % len(customers)]
        card = cards[i % len(cards)]
        device = devices[i % len(devices)]
        
        transaction = Transaction.objects.create(
            customer=customer,
            card=card,
            device=device,
            mcc="5411",
            merchant=merchants[i % len(merchants)],
            amount=100.00 + (i * 50),
            currency="INR",
            timestamp=datetime.now() - timedelta(hours=i),
            geo_lat=28.6139,
            geo_lon=77.2090,
            geo_country="IN"
        )
        print(f"Created transaction: {transaction.id}")
    
    # Create spend categories
    categories = [
        {"mcc": "5411", "category_name": "Grocery Stores"},
        {"mcc": "5812", "category_name": "Restaurants"},
        {"mcc": "5541", "category_name": "Gas Stations"},
        {"mcc": "6011", "category_name": "ATM Withdrawal"},
        {"mcc": "5999", "category_name": "Miscellaneous"}
    ]
    
    for cat_data in categories:
        category, created = SpendCategory.objects.get_or_create(
            mcc=cat_data["mcc"],
            defaults={"category_name": cat_data["category_name"]}
        )
        if created:
            print(f"Created spend category: {category.category_name}")
    
    # Create KB documents
    kb_docs = [
        {
            "title": "Fraud Detection Guidelines",
            "content": "Guidelines for detecting fraudulent transactions...",
            "category": "fraud_detection"
        },
        {
            "title": "Customer Service Procedures",
            "content": "Standard procedures for customer service...",
            "category": "customer_service"
        }
    ]
    
    for doc_data in kb_docs:
        doc, created = KnowledgeBaseDocument.objects.get_or_create(
            title=doc_data["title"],
            defaults={
                "content": doc_data["content"],
                "category": doc_data["category"]
            }
        )
        if created:
            print(f"Created KB document: {doc.title}")
    
    print("Test data creation completed!")

if __name__ == '__main__':
    create_test_data()
