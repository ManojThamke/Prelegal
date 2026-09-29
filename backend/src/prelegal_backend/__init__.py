import os


def main() -> None:
    """Runs the development server: `uv run prelegal-backend`."""
    import uvicorn

    uvicorn.run(
        "prelegal_backend.main:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
    )
