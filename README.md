# 🛡️ Setil Security Extension

> **A comprehensive, Zero-Knowledge threat intelligence and privacy dashboard for your browser.**

Setil is a modern Chrome Extension (Manifest V3) backed by a FastAPI cloud engine. It actively monitors your browser for phishing attempts, insecure downloads, aggressive API permissions, and compromised passwords—all while maintaining a sleek, privacy-first architecture.

![Setil Dashboard](docs/dashboard-screenshot.png) *(Note: Add your screenshot path here)*

## ✨ Core Modules

* **🎣 Phishing & Typosquatting Interceptor**
  * Uses local heuristics for zero-latency blocking of typosquatting (e.g., `g00gle.com`).
  * Integrates with the **VirusTotal API** for deep URL reputation scanning.
  * Features a hybrid bypass system (Temporary Session Allow vs. Cloud-Synced Whitelist).
* **🔐 Zero-Knowledge Password Vault**
  * Encrypts passwords locally using the **Web Crypto API (AES-GCM)** before they ever touch the network.
  * Checks for compromised passwords using k-Anonymity (`pwnedpasswords` API).
  * Auto-fills credentials, generates secure passwords, and syncs seamlessly across devices.
* **🕵️‍♂️ Permission Auditor (CSP Bypass Engine)**
  * Natively hooks into browser APIs (`navigator.geolocation`, `navigator.clipboard`) via MV3 `MAIN` world scripting to bypass Content Security Policies.
  * Calculates risk scores for websites attempting to access hardware APIs invisibly.
* **📦 Malicious Download Scanner**
  * Checks file extensions and double-extensions (e.g., `.pdf.exe`).
  * Computes SHA-256 hashes for downloads and verifies them against cloud threat registries.
* **🛡️ Tracking Prevention**
  * Strips known tracking parameters from URLs and blocks analytics scripts to preserve browsing privacy.

## 🏗️ Architecture & Tech Stack

Setil uses a **Hybrid Storage Strategy**. It caches encrypted data and rulesets in `chrome.storage.local` for instant, zero-latency execution in the background worker, and performs background synchronization with the PostgreSQL database when the user authenticates.

**Frontend (Extension):**
* React + TypeScript
* Manifest V3 Background Service Workers
* Chrome Storage & Scripting APIs
* Web Crypto API

**Backend (Cloud Engine):**
* FastAPI (Python)
* PostgreSQL (Neon/Local)
* SQLAlchemy (ORM)
* JWT Authentication

---

## 💻 Development & Local Setup

Interested in compiling the extension from source, running the FastAPI server, or testing the Docker containers locally? 

Please read our comprehensive **[Development Guide](DEVELOPMENT.md)** for instructions on setting up the monorepo, resolving dependencies with `pnpm` and `uv`, and managing the database.

---

## 🤝 Contributing

Setil is an open-source security initiative, and contributions from the community are highly encouraged! Whether it's a bug fix, a new feature, or a documentation update, we'd love your help.

### How to Contribute:
1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

Before submitting a Pull Request, please ensure your code passes the local linter (`pnpm lint`) and follows the existing TypeScript/Python style guidelines.

## 🔒 Security Policy

Because Setil handles sensitive user data and credentials, security is our top priority. 

If you discover a security vulnerability within Setil, please **do not** open a public issue. Instead, send a direct message or email to the maintainers. We will address the issue immediately and coordinate a secure patch release. 

## 📄 License

Distributed under the MIT License. See the `LICENSE` file for more information. This allows you to freely use, modify, and distribute the code, provided you include the original copyright and permission notice.