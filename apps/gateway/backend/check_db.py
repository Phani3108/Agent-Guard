#!/usr/bin/env python3
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aegis_support.settings')
django.setup()

from django.db import connection

def check_tables():
    cursor = connection.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print("Tables in database:")
    for table in tables:
        print(f"  - {table}")
    
    # Check if we have any data
    for table in tables:
        if not table.startswith('django_'):
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} records")

if __name__ == '__main__':
    check_tables()
