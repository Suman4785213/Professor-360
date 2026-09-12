"""
AI Certificate Intelligence — URL Routing
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIJobViewSet,
    AISearchAPIView,
    AIMetricsAPIView,
    AICopilotChatView,
    AICopilotConversationViewSet,
    AICopilotMessageListView,
    AICopilotActionConfirmView,
    AICopilotFeedbackView,
    AICopilotBenchmarkView,
)

router = DefaultRouter()
router.register('jobs', AIJobViewSet, basename='ai-job')
router.register('documents', AIJobViewSet, basename='ai-document')
router.register('copilot/conversations', AICopilotConversationViewSet, basename='copilot-conversation')

urlpatterns = [
    path('copilot/chat/', AICopilotChatView.as_view(), name='copilot-chat'),
    path('copilot/conversations/<uuid:conversation_id>/messages/', AICopilotMessageListView.as_view(), name='copilot-messages'),
    path('copilot/confirm-action/', AICopilotActionConfirmView.as_view(), name='copilot-confirm-action'),
    path('copilot/feedback/', AICopilotFeedbackView.as_view(), name='copilot-feedback'),
    path('copilot/benchmarks/', AICopilotBenchmarkView.as_view(), name='copilot-benchmarks'),
    path('', include(router.urls)),
    path('search/', AISearchAPIView.as_view(), name='ai-search'),
    path('metrics/', AIMetricsAPIView.as_view(), name='ai-metrics'),
]

