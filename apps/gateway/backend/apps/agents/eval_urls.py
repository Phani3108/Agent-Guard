from django.urls import path
from . import eval_views

urlpatterns = [
    path('run', eval_views.run_evals, name='run_evals'),
    path('results', eval_views.get_eval_results, name='get_eval_results'),
]
