"""
Core Exception Handler
Custom DRF exception handler providing production-hardened error responses.
Ensures zero stack traces, SQL errors, or internal paths are exposed to end users.
Attaches traceable correlation request IDs to all error payloads.
"""
import logging
from django.conf import settings
from django.http import Http404
from django.core.exceptions import PermissionDenied
from rest_framework.views import exception_handler
from rest_framework.exceptions import (
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied as DRFPermissionDenied,
    Throttled,
    NotFound,
    MethodNotAllowed,
)
from rest_framework import status
from rest_framework.response import Response

from .middleware import get_current_request_id

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Returns consistent, hardened error response matching Phase 12 specification:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "User-safe error explanation.",
            "request_id": "REQ-XXXXXXXXXXXX",
            "details": {...}   # optional validation field errors
        },
        "message": "User-safe error explanation."
    }
    """
    request = context.get('request')
    request_id = getattr(request, 'id', None) or get_current_request_id()

    # Call DRF's default handler first
    response = exception_handler(exc, context)

    # If DRF unhandled (e.g. 500 Internal Server Error from uncaught Python/DB error)
    if response is None:
        logger.error(
            f"Unhandled exception [req_id={request_id}]: {exc}",
            exc_info=True,
            extra={'request_id': request_id}
        )
        debug_msg = str(exc) if getattr(settings, 'DEBUG', False) else (
            "An unexpected server error occurred. Please quote your Request ID to support."
        )
        data = {
            'success': False,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': debug_msg,
                'request_id': request_id,
            },
            'message': debug_msg,
        }
        resp = Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        if request_id:
            resp['X-Request-ID'] = request_id
        return resp

    # Classify error code
    code, message, details = _parse_exception_info(exc, response)

    error_payload = {
        'code': code,
        'message': message,
        'request_id': request_id,
    }
    if details:
        error_payload['details'] = details

    data = {
        'success': False,
        'error': error_payload,
        'message': message,
    }
    if details:
        data['details'] = details

    response.data = data
    if request_id:
        response['X-Request-ID'] = request_id

    # Log client/auth errors at appropriate level
    if response.status_code >= 500:
        logger.error(f"API 500 error [req_id={request_id}]: {message}")
    elif response.status_code == 403:
        logger.warning(f"API 403 forbidden [req_id={request_id}]: {message}")
    elif response.status_code == 429:
        logger.warning(f"API 429 rate limited [req_id={request_id}]: {message}")

    return response


def _parse_exception_info(exc, response):
    """Extracts a semantic error code, user-friendly message, and field details."""
    code = 'API_ERROR'
    details = None

    if isinstance(exc, ValidationError):
        code = 'VALIDATION_ERROR'
        if isinstance(exc.detail, dict):
            details = exc.detail
            # Flatten first field error into message
            for field, errs in exc.detail.items():
                err_text = errs[0] if isinstance(errs, list) and errs else str(errs)
                message = f"{field}: {err_text}"
                return code, message, details
        elif isinstance(exc.detail, list) and exc.detail:
            message = str(exc.detail[0])
            return code, message, details
        message = str(exc.detail)
        return code, message, details

    elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        code = 'AUTHENTICATION_REQUIRED'
        message = "Authentication credentials were not provided or have expired."
    elif isinstance(exc, (DRFPermissionDenied, PermissionDenied)):
        code = 'PERMISSION_DENIED'
        message = getattr(exc, 'detail', "You do not have permission to perform this action.")
    elif isinstance(exc, (NotFound, Http404)):
        code = 'RESOURCE_NOT_FOUND'
        message = getattr(exc, 'detail', "The requested resource could not be found.")
    elif isinstance(exc, MethodNotAllowed):
        code = 'METHOD_NOT_ALLOWED'
        message = f"Method '{getattr(exc, 'detail', '')}' not allowed."
    elif isinstance(exc, Throttled):
        code = 'RATE_LIMIT_EXCEEDED'
        wait_seconds = getattr(exc, 'wait', 60)
        message = f"Request was throttled. Expected available in {wait_seconds} seconds."
    else:
        # Fallback to response status text
        if hasattr(exc, 'detail'):
            message = str(exc.detail)
        else:
            message = getattr(response, 'status_text', 'An error occurred processing your request.')

    return code, str(message), details
