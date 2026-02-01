from django.urls import path
from . import views

urlpatterns = [
    path('freeze-card', views.freeze_card, name='freeze_card'),
    path('unfreeze-card', views.unfreeze_card, name='unfreeze_card'),
    path('open-dispute', views.open_dispute, name='open_dispute'),
    path('contact-customer', views.contact_customer, name='contact_customer'),
]
