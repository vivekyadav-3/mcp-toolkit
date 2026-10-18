# 🚀 MongoDB-Backed MCP Task Manager & REST Toolkit

A production-grade, dual-interface Task Management System integrating a **Node/Express REST API**, a **Model Context Protocol (MCP) Server**, a **React Dashboard**, and a **100% Local AI Agent (Ollama + Qwen 2.5)**—all sharing a single source of truth backed by **MongoDB**.

---

## 🏛️ System Architecture

```text
                               ┌──────────────────────────────────────────────────────────┐
                               │                    CLIENT INTERFACES                     │
                               └──────────────────────────────────────────────────────────┘
                                      │                                      │
               (HTTP / REST / JSON)   │                                      │ (MCP JSON-RPC over stdio)
                                      ▼                                      ▼
                        ┌───────────────────────────┐          ┌───────────────────────────┐
                        │      React Dashboard      │          │     AI / MCP Clients      │
                        │    (Vite / Port 5173)     │          │  - Antigravity IDE        │
                        │             &             │          │  - Claude Desktop         │
                        │    Postman / HTTP API     │          │  - MCP Inspector          │
                        │     (Port 3000 /api)      │          │  - Ollama Local CLI       │
                        └─────────────┬─────────────┘          └─────────────┬─────────────┘
                                      │                                      │
                                      ▼                                      ▼
                        ┌───────────────────────────┐          ┌───────────────────────────┐
                        │   Express REST Router     │          │   MCP Tool Handlers       │
                        │   (routes/taskRoutes.js)  │          │   (server.js stdio)       │
                        └─────────────┬─────────────┘          └─────────────┬─────────────┘
                                      │                                      │
                                      └──────────────────┬───────────────────┘
                                                         ▼
                                            ┌─────────────────────────┐
                                            │   Shared Task Service   │
                                            │ (service/taskService.js)│
                                            └────────────┬────────────┘
                                                         ▼
                                            ┌─────────────────────────┐
                                            │    MongoDB Database     │
                                            │   (Collections: tasks)  │
                                            └─────────────────────────┘
```

---

## ✨ Features

- **Dual-Interface Sync:** Any change made via the **React UI**, **REST API (Postman)**, or **MCP AI Agent** is immediately reflected across all interfaces.
- **Single Source of Truth:** Shared service layer (`service/taskService.js`) enforces strict validation, ObjectId checks, and error codes across both HTTP and MCP.
- **Per-User Task Authorization:** Tasks are scoped by user (`userId`), preventing cross-user data leakage and unauthorized modifications.
- **Resilient Error Handling:** Returns structured HTTP status codes (`400`, `404`) and standard MCP error payloads instead of unhandled crashes.
- **100% Local AI Execution:** Includes an interactive local client (`ollamaClient.js`) powered by **Ollama (`qwen2.5:3b`)** running completely on-device without cloud API keys.
- **Automated Test Suite:** Built-in automated test suite covering all CRUD operations, schema validations, and multi-user isolation.

---

## 📂 Project Structure

```text
mcp/
├── .agents/
│   └── mcp_config.json        # Antigravity MCP workspace configuration
├── client/                     # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx             # Task dashboard component
│   │   └── index.css           # Modern glassmorphism styling
│   └── vite.config.js          # API proxy configuration
├── middleware/
│   └── auth.js                 # Authentication & per-user extraction middleware
├── models/
│   └── Task.js                 # Mongoose Task schema
├── routes/
│   └── taskRoutes.js           # Express REST API routes (/api/tasks)
├── service/
│   └── taskService.js          # Shared MongoDB business logic
├── test/
│   └── automatedTests.js       # Native Node.js test suite
├── .env                        # Environment variables (excluded from Git)
├── .gitignore                  # Git ignore rules
├── ollamaClient.js             # Local Ollama AI MCP CLI client
├── package.json                # Project dependencies and scripts
├── README.md                   # Project documentation
└── server.js                   # Unified Express HTTP + MCP stdio server
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** (v20+ recommended)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/mcp_task_manager
JWT_SECRET=super_secret_jwt_key_change_in_production_12345
```

### 3. Install Dependencies
```bash
# Root server dependencies
npm install

# Client dependencies
cd client
npm install
cd ..
```

### 4. Run the Backend (Express + MCP)
```bash
npm start
```
*Console output:*
```text
Connecting to MongoDB...
MongoDB connected successfully!
Express REST API running at http://localhost:3000/api/tasks
MCP Task Manager server running on stdio...
```

### 5. Run the React Dashboard
In a separate terminal:
```bash
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📡 REST API Reference

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description | Query / Body Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | List tasks | `?status=pending\|in-progress\|completed` |
| `GET` | `/tasks/stats` | Get count statistics | None |
| `GET` | `/tasks/:id` | Get task by ID | `id` (24-char hex string) |
| `POST` | `/tasks` | Create new task | `{"title": "...", "description": "...", "status": "..."}` |
| `PATCH` | `/tasks/:id` | Update task fields | `{"title": "...", "status": "..."}` |
| `DELETE` | `/tasks/:id` | Delete task | `id` (24-char hex string) |

### Header Authorization:
To test per-user authorization, supply:
```text
x-user-id: user_alice
```
Or a Bearer token:
```text
Authorization: Bearer user_alice
```

---

## 🤖 MCP Tool & Resource Reference

The MCP Server communicates over standard `stdio` JSON-RPC:

### Available Tools:
1. **`get_tasks`**: Retrieve tasks with optional `status` filter (`pending`, `in-progress`, `completed`).
2. **`get_task`**: Fetch a single task by MongoDB `id`.
3. **`create_task`**: Create a new task with `title`, `description`, and `status`.
4. **`update_task`**: Partially update title, description, or status by `id`.
5. **`delete_task`**: Remove a task by `id`.

### Resource:
- **`tasks://stats`**: Real-time read-only JSON summary containing total, pending, in-progress, and completed counts.

### Prompt:
- **`weekly_task_report`**: Generates an executive task summary report segmented by focus area.

---

## 🧪 Testing with Host Clients

### 1. Official Anthropic MCP Inspector
```bash
npx @modelcontextprotocol/inspector node server.js
```
Open the generated URL, click **Connect**, select **Tools**, and test `create_task` or `get_tasks` visually.

### 2. Local AI Model (Ollama + Qwen 2.5)
No paid API keys needed!
```bash
# 1. Start Ollama and download the model
ollama pull qwen2.5:3b

# 2. Launch the interactive CLI
node ollamaClient.js
```
**Example interactions:**
- *"Create a task to revise DBMS."*
- *"Show me all pending tasks."*
- *"Summarize my weekly progress."*

---

## 🛡️ Automated Test Results

Run the automated test suite covering all CRUD logic and security validations:
```bash
npm test
```

### Verified Test Results:
```text
TAP version 13
# Subtest: Task Service & Per-User Authorization Tests
    ok 1 - 1. Create task for Alice
    ok 2 - 2. List tasks is strictly isolated per user
    ok 3 - 3. User Bob cannot read Alice's task by ID (Unauthorized)
    ok 4 - 4. User Bob cannot update Alice's task (Unauthorized)
    ok 5 - 5. Alice can successfully update her own task
    ok 6 - 6. Validation: Rejects empty title
    ok 7 - 7. Validation: Rejects invalid ObjectId format
    ok 8 - 8. User Bob cannot delete Alice's task
    ok 9 - 9. Alice can delete her own task
    ok 10 - 10. Task statistics are strictly per-user
1..10
# tests 10
# suites 1
# pass 10
# fail 0
# cancelled 0
# skipped 0
```

---

## 📄 License
MIT License. Built for fullstack agentic workflows.
