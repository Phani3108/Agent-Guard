#!/usr/bin/env python3
"""
Script to generate 1M transactions for performance testing
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Load existing data
def load_fixtures():
    fixtures_dir = Path(__file__).parent.parent / "fixtures"
    
    with open(fixtures_dir / "customers.json") as f:
        customers = json.load(f)
    
    with open(fixtures_dir / "cards.json") as f:
        cards = json.load(f)
    
    with open(fixtures_dir / "devices.json") as f:
        devices = json.load(f)
    
    return customers, cards, devices

# MCC categories with weights
MCC_CATEGORIES = {
    "5411": {"name": "Grocery Stores", "weight": 0.25},
    "5812": {"name": "Eating Places", "weight": 0.20},
    "6011": {"name": "ATM Withdrawals", "weight": 0.15},
    "5541": {"name": "Gas Stations", "weight": 0.10},
    "5311": {"name": "Department Stores", "weight": 0.08},
    "5814": {"name": "Fast Food", "weight": 0.07},
    "5999": {"name": "Miscellaneous Retail", "weight": 0.05},
    "7011": {"name": "Hotels", "weight": 0.03},
    "4121": {"name": "Taxi Services", "weight": 0.02},
    "7372": {"name": "Computer Services", "weight": 0.02},
    "4816": {"name": "Computer Network Services", "weight": 0.01},
    "5993": {"name": "Cigar Stores", "weight": 0.01},
    "5944": {"name": "Jewelry Stores", "weight": 0.01},
}

# Merchant names by category
MERCHANTS = {
    "5411": ["Big Bazaar", "Reliance Fresh", "D-Mart", "More", "Spencer's"],
    "5812": ["McDonald's", "KFC", "Pizza Hut", "Domino's", "Subway", "Starbucks"],
    "6011": ["ATM Withdrawal", "Cash Withdrawal", "ATM Transaction"],
    "5541": ["HP Petrol Pump", "IOCL Station", "BPCL Outlet", "Shell Station"],
    "5311": ["Shoppers Stop", "Pantaloons", "Westside", "Lifestyle"],
    "5814": ["Burger King", "Wendy's", "Taco Bell", "Dunkin' Donuts"],
    "5999": ["General Store", "Convenience Store", "Local Shop"],
    "7011": ["Taj Hotel", "Oberoi", "ITC Hotel", "Marriott"],
    "4121": ["Uber", "Ola", "Meru Cabs", "QuickCab"],
    "7372": ["Tech Support", "Software Services", "IT Services"],
    "4816": ["Internet Services", "Mobile Data", "WiFi Services"],
    "5993": ["Tobacco Shop", "Cigar Store"],
    "5944": ["Tanishq", "Kalyan Jewellers", "Malabar Gold"],
}

# Indian cities with coordinates
CITIES = [
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777, "country": "IN"},
    {"name": "Delhi", "lat": 28.7041, "lon": 77.1025, "country": "IN"},
    {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946, "country": "IN"},
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707, "country": "IN"},
    {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639, "country": "IN"},
    {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867, "country": "IN"},
    {"name": "Pune", "lat": 18.5204, "lon": 73.8567, "country": "IN"},
    {"name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714, "country": "IN"},
    {"name": "Jaipur", "lat": 26.9124, "lon": 75.7873, "country": "IN"},
    {"name": "Surat", "lat": 21.1702, "lon": 72.8311, "country": "IN"},
]

def generate_transaction(transaction_id, customers, cards, devices, start_date, end_date):
    """Generate a single transaction"""
    
    # Select customer and card
    customer = random.choice(customers)
    customer_cards = [card for card in cards if card["customerId"] == customer["id"]]
    if not customer_cards:
        return None
    
    card = random.choice(customer_cards)
    
    # Select device (may be None for some transactions)
    customer_devices = [device for device in devices if device["customerId"] == customer["id"]]
    device = random.choice(customer_devices) if customer_devices else None
    
    # Select MCC based on weights
    mcc = random.choices(
        list(MCC_CATEGORIES.keys()),
        weights=[cat["weight"] for cat in MCC_CATEGORIES.values()],
        k=1
    )[0]
    
    # Select merchant
    merchant = random.choice(MERCHANTS[mcc])
    
    # Generate amount based on MCC
    if mcc == "6011":  # ATM withdrawals
        amount = -random.randint(1000, 50000)  # 10-500 rupees
    elif mcc in ["5411", "5311"]:  # Grocery, Department stores
        amount = -random.randint(500, 10000)  # 5-100 rupees
    elif mcc in ["5812", "5814"]:  # Restaurants
        amount = -random.randint(200, 2000)  # 2-20 rupees
    elif mcc == "5541":  # Gas stations
        amount = -random.randint(1000, 5000)  # 10-50 rupees
    elif mcc == "7011":  # Hotels
        amount = -random.randint(5000, 50000)  # 50-500 rupees
    else:
        amount = -random.randint(100, 5000)  # 1-50 rupees
    
    # Generate timestamp
    time_diff = end_date - start_date
    random_seconds = random.randint(0, int(time_diff.total_seconds()))
    timestamp = start_date + timedelta(seconds=random_seconds)
    
    # Select city
    city = random.choice(CITIES)
    
    # Add some geo variation
    lat = city["lat"] + random.uniform(-0.1, 0.1)
    lon = city["lon"] + random.uniform(-0.1, 0.1)
    
    return {
        "id": f"txn_{transaction_id:08d}",
        "customerId": customer["id"],
        "cardId": card["id"],
        "mcc": mcc,
        "merchant": merchant,
        "amount": amount,
        "currency": "INR",
        "ts": timestamp.isoformat() + "Z",
        "deviceId": device["id"] if device else None,
        "geo": {
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "country": city["country"]
        }
    }

def main():
    """Generate 1M transactions"""
    print("Loading fixtures...")
    customers, cards, devices = load_fixtures()
    
    print("Generating 1M transactions...")
    
    # Date range: Last 2 years
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    
    transactions = []
    batch_size = 10000
    
    for i in range(1, 1000001):  # 1M transactions
        transaction = generate_transaction(i, customers, cards, devices, start_date, end_date)
        if transaction:
            transactions.append(transaction)
        
        if i % batch_size == 0:
            print(f"Generated {i:,} transactions...")
    
    # Save to file
    output_file = Path(__file__).parent.parent / "fixtures" / "transactions_1m.json"
    print(f"Saving to {output_file}...")
    
    with open(output_file, 'w') as f:
        json.dump(transactions, f, indent=2)
    
    print(f"Generated {len(transactions):,} transactions successfully!")
    print(f"Date range: {start_date.date()} to {end_date.date()}")
    
    # Print some statistics
    mcc_counts = {}
    for txn in transactions:
        mcc = txn["mcc"]
        mcc_counts[mcc] = mcc_counts.get(mcc, 0) + 1
    
    print("\nTransaction distribution by MCC:")
    for mcc, count in sorted(mcc_counts.items(), key=lambda x: x[1], reverse=True):
        category = MCC_CATEGORIES[mcc]["name"]
        percentage = (count / len(transactions)) * 100
        print(f"  {mcc} ({category}): {count:,} ({percentage:.1f}%)")

if __name__ == "__main__":
    main()
