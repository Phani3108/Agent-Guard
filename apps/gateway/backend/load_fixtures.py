#!/usr/bin/env python3
import os
import sys
import django
import json
from datetime import datetime

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aegis_support.settings')
django.setup()

from apps.customers.models import Customer, Card, Device
from apps.transactions.models import Transaction, Chargeback
from apps.insights.models import KnowledgeBaseDocument, SpendCategory

def load_customers():
    print('Loading customers...')
    with open('/app/fixtures/customers.json', 'r') as f:
        customers_data = json.load(f)
    
    for customer_data in customers_data:
        customer, created = Customer.objects.get_or_create(
            id=customer_data['id'],
            defaults={
                'name': customer_data['name'],
                'email_masked': customer_data['email_masked'],
                'risk_flags': customer_data.get('risk_flags', [])
            }
        )
        if created:
            print(f'Created customer: {customer.name}')

def load_cards():
    print('Loading cards...')
    with open('/app/fixtures/cards.json', 'r') as f:
        cards_data = json.load(f)
    
    for card_data in cards_data:
        try:
            customer = Customer.objects.get(id=card_data['customerId'])
            card, created = Card.objects.get_or_create(
                id=card_data['id'],
                defaults={
                    'customer': customer,
                    'last4': card_data['last4'],
                    'status': card_data['status'],
                    'network': card_data.get('network', 'VISA')
                }
            )
            if created:
                print(f'Created card: {card.last4}')
        except Customer.DoesNotExist:
            print(f'Customer not found for card {card_data["id"]}')

def
