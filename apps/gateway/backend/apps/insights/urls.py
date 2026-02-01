from django.urls import path
from . import views

urlpatterns = [
    path('<str:customer_id>/summary', views.get_customer_insights, name='get_customer_insights'),
    path('categories', views.get_spend_categories, name='get_spend_categories'),
    path('report', views.generate_insight_report, name='generate_insight_report'),
]
