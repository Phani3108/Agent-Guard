from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import logging
from .models import KnowledgeBaseDocument
from apps.core.authentication import APIKeyAuthentication

logger = logging.getLogger(__name__)


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def search_kb(request):
    """
    Search knowledge base for relevant information.
    """
    try:
        query = request.GET.get('q', '')
        
        if not query:
            return Response(
                {'error': 'Query parameter q is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check cache first
        cache_key = f"kb_search:{query}"
        cached_results = cache.get(cache_key)
        if cached_results:
            return Response(cached_results)
        
        # Search knowledge base
        documents = KnowledgeBaseDocument.objects.filter(
            content__icontains=query
        ).order_by('title')[:10]  # Limit to 10 results
        
        results = []
        for doc in documents:
            # Find the relevant chunk containing the query
            content = doc.content
            query_lower = query.lower()
            content_lower = content.lower()
            
            # Find the position of the query in the content
            pos = content_lower.find(query_lower)
            if pos != -1:
                # Extract context around the query
                start = max(0, pos - 100)
                end = min(len(content), pos + len(query) + 100)
                extract = content[start:end]
                
                # Add ellipsis if needed
                if start > 0:
                    extract = '...' + extract
                if end < len(content):
                    extract = extract + '...'
            else:
                # If query not found in content, use first 200 chars
                extract = content[:200] + '...' if len(content) > 200 else content
            
            results.append({
                'docId': doc.id,
                'title': doc.title,
                'anchor': doc.anchor,
                'extract': extract
            })
        
        response_data = {
            'results': results,
            'query': query,
            'total': len(results)
        }
        
        # Cache for 1 hour
        cache.set(cache_key, response_data, timeout=3600)
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in search_kb: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def get_kb_document(request, doc_id):
    """
    Get full knowledge base document by ID.
    """
    try:
        document = KnowledgeBaseDocument.objects.get(id=doc_id)
        
        return Response({
            'id': document.id,
            'title': document.title,
            'anchor': document.anchor,
            'content': document.content,
            'chunks': document.chunks,
            'created_at': document.created_at.isoformat(),
            'updated_at': document.updated_at.isoformat()
        })
        
    except KnowledgeBaseDocument.DoesNotExist:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in get_kb_document: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([APIKeyAuthentication])
@permission_classes([IsAuthenticated])
def list_kb_documents(request):
    """
    List all knowledge base documents.
    """
    try:
        documents = KnowledgeBaseDocument.objects.all().order_by('title')
        
        results = []
        for doc in documents:
            results.append({
                'id': doc.id,
                'title': doc.title,
                'anchor': doc.anchor,
                'created_at': doc.created_at.isoformat(),
                'updated_at': doc.updated_at.isoformat()
            })
        
        return Response({
            'documents': results,
            'total': len(results)
        })
        
    except Exception as e:
        logger.error(f"Error in list_kb_documents: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
