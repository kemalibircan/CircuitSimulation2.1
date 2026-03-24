"""
app/core/errors.py — Global error models and FastAPI exception handlers.
"""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


# ── Shared error response schema ──────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: dict | list | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ── Custom exceptions ─────────────────────────────────────────

class CircuitAIError(Exception):
    """Base exception for all application errors."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "internal_error"

    def __init__(self, message: str, detail: dict | list | None = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class NotFoundError(CircuitAIError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ValidationError(CircuitAIError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "validation_error"


class NetlistValidationError(CircuitAIError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "netlist_validation_error"


class SimulationError(CircuitAIError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "simulation_error"


class LLMError(CircuitAIError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "llm_error"


class RunNotFoundError(NotFoundError):
    code = "run_not_found"

    def __init__(self, run_id: str):
        super().__init__(f"Run '{run_id}' not found")


class IterationNotFoundError(NotFoundError):
    code = "iteration_not_found"


# ── FastAPI exception handlers ────────────────────────────────

def _make_error_response(exc: CircuitAIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                detail=exc.detail,
            )
        ).model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(CircuitAIError)
    async def circuit_ai_error_handler(request: Request, exc: CircuitAIError) -> JSONResponse:
        return _make_error_response(exc)

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        from app.core.logging import get_logger
        logger = get_logger("errors")
        logger.error("unhandled_exception", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                error=ErrorDetail(code="internal_error", message="An unexpected error occurred.")
            ).model_dump(),
        )
