# 🛠️ Setil Development Guide

This document contains step-by-step instructions for setting up, running, and maintaining the Setil monorepo development environment.

---

## 📋 Prerequisites

Ensure you have the following tools installed locally before beginning setup:

* **Node.js**: Version 20 or higher recommended.
* **pnpm**: Version 11.5.1 or higher (enforced via `only-allow`).
* **uv**: Astral's Python package installer and resolver.
* **Docker & Docker Compose**: For containerized database and backend workflows.

---

## 🚀 Getting Started

### 1. Repository Installation
Clone the repository and install the project dependencies at the root workspace directory.

```bash
# Install Node/Extension dependencies
pnpm install

# Initialize Python environment and sync backend dependencies locally
cd apps/backend
uv sync
cd ../..
```

### 2. Environment Configuration
Create an environment file for the backend service worker and database connection layers.

Create a file named `.env` inside the `apps/backend/` directory:

```env
DATABASE_URL=postgresql://setil:setil@setil-db:5432/setil
VIRUSTOTAL_API_KEY=your_api_key_here
SECRET_KEY=your_development_jwt_secret_key
```

---

## 💻 Local Development Workflow

You can spin up the development environment either natively on your local machine or using Docker containers with live-sync.

### Method A: Full Dockerized Stack with Hot Reload (Recommended)

Thanks to the `docker-compose.override.yaml` configuration, you can run the entire backend infrastructure inside an isolated container network while still enjoying real-time hot reloading.

1. **Start the containers in the background:**
```bash
   docker compose up -d
   ```
2. **Activate Docker Watch for live code syncing:**
```bash
   docker compose watch
   ```
   *This syncs changes from `./apps/backend` directly into the `/app` directory inside the container, automatically ignoring your local `.venv/` and `__pycache__/` to save memory and prevent conflicts. If you modify `pyproject.toml` or `uv.lock`, Docker will automatically rebuild the environment.*

3. **Run the Extension Bundler locally:**
   Open a new terminal tab and start the frontend compiler:
```bash
   pnpm dev
   ```

### Method B: Native Local Development

If you prefer running the Python server directly on your host machine:

1. **Start only the Database Container:**
```bash
   docker compose up setil-db -d
   ```
2. **Launch the Backend Engine:**
Run the FastAPI development server from the repository root:
```bash
   pnpm dev:backend
   ```
   *The API documentation will be available locally at: `http://127.0.0.1:8000/docs`*
3. **Run the Extension Bundler:**
```bash
   pnpm dev
   ```

---

## 🛠️ CLI Command Reference

Execute all core actions from the repository root using `pnpm`:

| Command | Action |
| :--- | :--- |
| `pnpm install` | Restricts installation to `pnpm` and resolves workspace targets. |
| `pnpm dev` | Starts the browser extension watcher sub-process (`dev:extension`). |
| `pnpm dev:backend` | Boots the Uvicorn local worker targeted at `apps/backend`. |
| `pnpm build` | Compiles a production-ready package of the Chrome extension. |
| `pnpm lint` | Validates styles, syntax, and TypeScript errors across the extension. |

---

## 📦 Loading the Extension into Chrome

Once the extension bundler is running or built, follow these steps to load it into your development browser:

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle the **Developer mode** switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left section.
4. Select the output directory (usually `dist` or `build`) located within `apps/extension/`.

---

## 🔬 Testing Content Security Policy (CSP) Interceptions

When editing or writing new hooks inside the permission manager system:
1. Reload the extension in `chrome://extensions/` after any changes.
2. Refresh your open browser target tabs to force Chrome to re-inject the updated `MAIN` world scripting context.
3. Evaluate API access vectors (`navigator.geolocation` or `navigator.clipboard`) directly via the browser DevTools Console to monitor messaging propagation pipelines.