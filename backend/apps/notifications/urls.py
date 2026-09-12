from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.notifications.views import (
    NotificationViewSet,
    IQACTaskViewSet,
    WorkQueueViewSet,
    AutomationRuleViewSet,
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'tasks', IQACTaskViewSet, basename='task')
router.register(r'work-queue', WorkQueueViewSet, basename='work-queue')
router.register(r'work-queues', WorkQueueViewSet, basename='work-queues')
router.register(r'automation-rules', AutomationRuleViewSet, basename='automation-rule')

urlpatterns = [
    path('', include(router.urls)),
]
