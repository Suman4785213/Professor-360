from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActivityViewSet, DocumentViewSet, ActivityCategoryViewSet, DocumentCategoryViewSet

router = DefaultRouter()
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'activity-categories', ActivityCategoryViewSet, basename='activity-category')
router.register(r'document-categories', DocumentCategoryViewSet, basename='document-category')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]
