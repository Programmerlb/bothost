import hmac
import os

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(
    title="Bothost Runner API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

RUNNER_API_SECRET = os.environ.get("RUNNER_API_SECRET", "")


class ActionRequest(BaseModel):
    action: str = Field(pattern="^(deploy|start|stop|restart)$")
    request_id: str = Field(min_length=8, max_length=128)


def require_runner_secret(authorization: str | None = Header(default=None)) -> None:
    if not RUNNER_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="runner_not_configured",
        )
    expected = f"Bearer {RUNNER_API_SECRET}"
    if authorization is None or not hmac.compare_digest(authorization, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="unauthorized",
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "bothost-runner"}


@app.post("/v1/bots/{bot_id}/actions", dependencies=[Depends(require_runner_secret)])
def submit_action(bot_id: str, request: ActionRequest) -> dict[str, str]:
    # The isolated container supervisor is intentionally not enabled yet.
    # This endpoint is a control-plane contract, not an execution endpoint.
    # Implement durable job claiming, ownership verification, archive validation,
    # and sandbox provisioning before enabling user bot execution.
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="runner_runtime_not_configured",
    )
