from django.urls import path
from . import views
from . import alerts_views

urlpatterns = [
    path('', views.metrics, name='metrics'),
    path('', views.health, name='health'),
    path('alerts', alerts_views.get_fraud_alerts, name='alerts'),
    path('metrics', views.kpis, name='kpis'),
]
