from django.urls import path
from . import kb_views

urlpatterns = [
    path('search', kb_views.search_kb, name='search_kb'),
    path('documents', kb_views.list_kb_documents, name='list_kb_documents'),
    path('documents/<str:doc_id>', kb_views.get_kb_document, name='get_kb_document'),
]
