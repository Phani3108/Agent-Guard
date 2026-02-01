from django.urls import path
from . import views

urlpatterns = [
    path('', views.triage_fraud, name='triage_fraud'),
    path('stream', views.triage_fraud_stream, name='triage_fraud_stream'),
    path('executions/<str:execution_id>', views.get_execution_status, name='get_execution_status'),
    path('executions/<str:execution_id>/trace', views.get_execution_trace, name='get_execution_trace'),
    path('inspect', views.inspect_safety, name='inspect_safety'),
]
