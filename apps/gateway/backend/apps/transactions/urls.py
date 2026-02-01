from django.urls import path
from . import views

urlpatterns = [
    path('transactions', views.ingest_transactions, name='ingest_transactions'),
    path('<str:customer_id>/transactions', views.get_customer_transactions, name='get_customer_transactions'),
]
