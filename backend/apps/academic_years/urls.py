from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AcademicYearViewSet

router = DefaultRouter()
router.register(r'academic-years', AcademicYearViewSet, basename='academicyear')

urlpatterns = [
    path('', include(router.urls)),
]
