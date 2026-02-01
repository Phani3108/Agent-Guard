#!/usr/bin/env python3
"""
Script to load fixture data into the Django database.
This converts the custom fixture format to Django model instances.
"""

import os
import sys
import django
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aegis_support.settings')
django.setup()

from apps.customers.models import Customer, Card, Device
from apps.transactions.models import Transaction, Chargeback
from apps.insights.models import KnowledgeBaseDocument, SpendCategory
from apps.agents.models import AgentExecution
from apps.actions.models import Action, Dispute
from apps.observability.models import Metric, AuditLog

def load_customers():
    """Load customers from fixtures/customers.json"""
    print("Loading customers...")
    
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
            print(f"Created customer: {customer.name}")
        else:
            print(f"Customer already exists: {customer.name}")

def load_cards():
    """Load cards from fixtures/cards.json"""
    print("Loading cards...")
    
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
                print(f"Created card: {card.last4}")
        except Customer.DoesNotExist:
            print(f"Customer not found for card {card_data['id']}")

def load_devices():
    """Load devices from fixtures/devices.json"""
    print("Loading devices...")
    
    with open('/app/fixtures/devices.json', 'r') as f:
        devices_data = json.load(f)
    
    for device_data in devices_data:
        try:
            customer = Customer.objects.get(id=device_data['customerId'])
            device, created = Device.objects.get_or_create(
                id=device_data['id'],
                defaults={
                    'customer': customer,
                    'device_type': device_data.get('deviceType', 'mobile'),
                    'is_trusted': device_data.get('isTrusted', True),
                    'last_seen': datetime.fromisoformat(device_data['lastSeen'].replace('Z', '+00:00'))
                }
            )
            if created:
                print(f"Created device: {device.id}")
        except Customer.DoesNotExist:
            print(f"Customer not found for device {device_data['id']}")

def load_transactions():
    """Load transactions from fixtures/transactions_sample.json"""
    print("Loading transactions...")
    
    with open('/app/fixtures/transactions_sample.json', 'r') as f:
        transactions_data = json.load(f)
    
    for txn_data in transactions_data:
        try:
            customer = Customer.objects.get(id=txn_data['customerId'])
            card = Card.objects.get(id=txn_data['cardId'])
            device = Device.objects.get(id=txn_data['deviceId'])
            
            transaction, created = Transaction.objects.get_or_create(
                id=txn_data['id'],
                defaults={
                    'customer': customer,
                    'card': card,
                    'mcc': txn_data['mcc'],
                    'merchant': txn_data['merchant'],
                    'amount': txn_data['amount'],
                    'currency': txn_data['currency'],
                    'timestamp': datetime.fromisoformat(txn_data['ts'].replace('Z', '+00:00')),
                    'device': device,
                    'geo_lat': txn_data['geo']['lat'],
                    'geo_lon': txn_data['geo']['lon'],
                    'geo_country': txn_data['geo']['country']
                }
            )
            if created:
                print(f"Created transaction: {transaction.id}")
        except (Customer.DoesNotExist, Card.DoesNotExist, Device.DoesNotExist) as e:
            print(f"Error loading transaction {txn_data['id']}: {e}")

def load_chargebacks():
    """Load chargebacks from fixtures/chargebacks.json"""
    print("Loading chargebacks...")
    
    with open('/app/fixtures/chargebacks.json', 'r') as f:
        chargebacks_data = json.load(f)
    
    for cb_data in chargebacks_data:
        try:
            customer = Customer.objects.get(id=cb_data['customerId'])
            transaction = Transaction.objects.get(id=cb_data['transactionId'])
            
            chargeback, created = Chargeback.objects.get_or_create(
                id=cb_data['id'],
                defaults={
                    'customer': customer,
                    'transaction': transaction,
                    'reason_code': cb_data['reasonCode'],
                    'amount': cb_data['amount'],
                    'status': cb_data['status'],
                    'created_at': datetime.fromisoformat(cb_data['createdAt'].replace('Z', '+00:00'))
                }
            )
            if created:
                print(f"Created chargeback: {chargeback.id}")
        except (Customer.DoesNotExist, Transaction.DoesNotExist) as e:
            print(f"Error loading chargeback {cb_data['id']}: {e}")

def load_kb_docs():
    """Load knowledge base documents from fixtures/kb_docs.json"""
    print("Loading knowledge base documents...")
    
    with open('/app/fixtures/kb_docs.json', 'r') as f:
        kb_data = json.load(f)
    
    for doc_data in kb_data:
        kb_doc, created = KnowledgeBaseDocument.objects.get_or_create(
            id=doc_data['id'],
            defaults={
                'title': doc_data['title'],
                'anchor': doc_data['anchor'],
                'content': doc_data['content'],
                'chunks': doc_data.get('chunks', [])
            }
        )
        if created:
            print(f"Created KB document: {kb_doc.title}")

def load_spend_categories():
    """Load spend categories"""
    print("Loading spend categories...")
    
    categories = [
        {'mcc': '6011', 'category_name': 'ATM Withdrawal'},
        {'mcc': '5411', 'category_name': 'Grocery Stores'},
        {'mcc': '5812', 'category_name': 'Restaurants'},
        {'mcc': '5541', 'category_name': 'Gas Stations'},
        {'mcc': '4121', 'category_name': 'Taxi Services'},
        {'mcc': '5999', 'category_name': 'Miscellaneous'},
        {'mcc': '5311', 'category_name': 'Department Stores'},
        {'mcc': '5814', 'category_name': 'Fast Food'},
        {'mcc': '5912', 'category_name': 'Drug Stores'},
        {'mcc': '5732', 'category_name': 'Electronics'},
    ]
    
    for cat_data in categories:
        category, created = SpendCategory.objects.get_or_create(
            mcc=cat_data['mcc'],
            defaults={'category_name': cat_data['category_name']}
        )
        if created:
            print(f"Created spend category: {category.category_name}")

def main():
    """Main function to load all fixture data"""
    print("Starting fixture data loading...")
    
    try:
        load_customers()
        load_cards()
        load_devices()
        load_transactions()
        load_chargebacks()
        load_kb_docs()
        load_spend_categories()
        
        print("\n✅ All fixture data loaded successfully!")
        
        # Print summary
        print(f"\nData Summary:")
        print(f"- Customers: {Customer.objects.count()}")
        print(f"- Cards: {Card.objects.count()}")
        print(f"- Devices: {Device.objects.count()}")
        print(f"- Transactions: {Transaction.objects.count()}")
        print(f"- Chargebacks: {Chargeback.objects.count()}")
        print(f"- KB Documents: {KnowledgeBaseDocument.objects.count()}")
        print(f"- Spend Categories: {SpendCategory.objects.count()}")
        
    except Exception as e:
        print(f"❌ Error loading fixtures: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
