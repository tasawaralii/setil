FROM python:3.14
WORKDIR /app

COPY ./apps/backend/uv.lock /app/uv.lock
COPY ./apps/backend/pyproject.toml /app/pyproject.toml

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN uv sync --no-dev
COPY ./apps/backend /app
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]