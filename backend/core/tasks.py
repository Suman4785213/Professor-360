"""
Background Task & Safe Retry Engine (Phase 12)
Provides an idempotent, bounded background task executor with exponential backoff,
structured failure recording, and graceful degradation when Redis/Celery is unavailable.
"""
import time
import uuid
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Any, Dict, Optional
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Bounded thread pool executor for local asynchronous execution
_TASK_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix='iqac_worker_')


class TaskExecutionState:
    PENDING = 'PENDING'
    RUNNING = 'RUNNING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    RETRYING = 'RETRYING'


class BackgroundTaskService:
    """
    Manages background job execution, retries with exponential backoff,
    and duplicate request suppression via idempotency keys.
    """

    @staticmethod
    def _get_idempotency_cache_key(idempotency_key: str) -> str:
        return f"task:idempotency:{idempotency_key}"

    @classmethod
    def run_task(
        cls,
        func: Callable,
        *args,
        task_name: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        max_retries: int = 3,
        initial_delay: float = 0.5,
        backoff_factor: float = 2.0,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Executes a task with retries, exponential backoff, and idempotency checks.
        Safe for use directly in synchronous context or inside worker threads.
        """
        task_id = str(uuid.uuid4())
        name = task_name or func.__name__

        # Check idempotency
        if idempotency_key:
            cache_key = cls._get_idempotency_cache_key(idempotency_key)
            try:
                cached_status = cache.get(cache_key)
                if cached_status in (TaskExecutionState.COMPLETED, TaskExecutionState.RUNNING):
                    logger.info(f"Duplicate task suppressed by idempotency key '{idempotency_key}' (status={cached_status})")
                    return {
                        'task_id': task_id,
                        'name': name,
                        'status': cached_status,
                        'idempotency_key': idempotency_key,
                        'message': 'Duplicate request suppressed by idempotency control.',
                    }
                # Mark in-progress in cache for 10 minutes
                cache.set(cache_key, TaskExecutionState.RUNNING, timeout=600)
            except Exception as cache_err:
                logger.warning(f"Cache check failed for idempotency (graceful bypass): {cache_err}")

        # Attempt execution with retries
        current_delay = initial_delay
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Executing task '{name}' [id={task_id}, attempt={attempt}/{max_retries}]")
                result = func(*args, **kwargs)

                # Mark successful in cache
                if idempotency_key:
                    try:
                        cache.set(cls._get_idempotency_cache_key(idempotency_key), TaskExecutionState.COMPLETED, timeout=3600)
                    except Exception:
                        pass

                return {
                    'task_id': task_id,
                    'name': name,
                    'status': TaskExecutionState.COMPLETED,
                    'result': result,
                    'attempts': attempt,
                }

            except Exception as exc:
                last_error = exc
                logger.warning(
                    f"Task '{name}' [id={task_id}] failed on attempt {attempt}/{max_retries}: {str(exc)}"
                )

                if attempt < max_retries:
                    # Delay before retry
                    time.sleep(current_delay)
                    current_delay *= backoff_factor
                else:
                    logger.error(
                        f"Task '{name}' [id={task_id}] reached maximum retries ({max_retries}). Marking FAILED. Error: {str(exc)}"
                    )

        # Record failure state
        if idempotency_key:
            try:
                cache.set(cls._get_idempotency_cache_key(idempotency_key), TaskExecutionState.FAILED, timeout=300)
            except Exception:
                pass

        return {
            'task_id': task_id,
            'name': name,
            'status': TaskExecutionState.FAILED,
            'error': str(last_error),
            'attempts': max_retries,
        }

    @classmethod
    def dispatch_async(
        cls,
        func: Callable,
        *args,
        task_name: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        max_retries: int = 3,
        **kwargs
    ):
        """
        Dispatches a task to the background thread pool without blocking the HTTP request.
        """
        return _TASK_EXECUTOR.submit(
            cls.run_task,
            func,
            *args,
            task_name=task_name,
            idempotency_key=idempotency_key,
            max_retries=max_retries,
            **kwargs
        )
