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

## ✨ Features & Capabilities

- **Dual-Interface Synchronization:** Any change made via the **React UI**, **REST API (Postman)**, or **MCP AI Agent** is immediately reflected across all interfaces in real time.
- **Single Source of Truth:** Shared service layer (`service/taskService.js`) enforces strict schema validation, 24-character hexadecimal ObjectId checks, and error codes across both HTTP and MCP.
- **Production-Grade Security:**
  - Standard Bearer JWT token verification (`middleware/auth.js`).
  - Per-user task authorization scoping (`userId`), preventing cross-user data leakage.
  - Zero unauthenticated fallback in production (`NODE_ENV=production`).
  - Token generator endpoint (`POST /api/auth/token`).
- **Resilient Error Handling:** Returns clean HTTP status codes (`400 Bad Request`, `401 Unauthorized`, `404 Not Found`) and standard MCP error payloads instead of server crashes.
- **100% Local AI Execution (Zero Cloud Fees):** Interactive CLI (`ollamaClient.js`) powered by **Ollama (`qwen2.5:3b`)** running completely on-device using local CPU/RAM.
- **Comprehensive Automated Test Suite:** 22 automated tests covering CRUD operations, per-user access control, JWT verification, and live MCP stdio execution.

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
│   └── auth.js                 # Production-ready JWT authentication middleware
├── models/
│   └── Task.js                 # Mongoose Task schema (with userId index)
├── routes/
│   ├── authRoutes.js           # JWT token issuance endpoint (/api/auth/token)
│   └── taskRoutes.js           # Express REST API routes (/api/tasks)
├── service/
│   └── taskService.js          # Shared MongoDB business logic
├── test/
│   └── automatedTests.js       # 22-test automated suite (Node.js test runner)
├── .env                        # Local environment variables (excluded from Git)
├── .env.example                # Example environment configuration
├── .gitignore                  # Git ignore rules
├── ollamaClient.js             # Local Ollama AI MCP CLI client
├── package.json                # Project dependencies and scripts
├── README.md                   # Project documentation
└── server.js                   # Unified Express HTTP + MCP stdio server
```

---

## 🚀 Step-by-Step Installation & Setup

### 1. Prerequisites
- **Node.js** (v20+ recommended)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`
- *(Optional for Local AI)* **Ollama** installed from [ollama.com](https://ollama.com)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/mcp_task_manager
JWT_SECRET=super_secret_jwt_key_change_in_production_12345
NODE_ENV=development
ALLOW_DEV_HEADER=true
ALLOW_ANONYMOUS=true
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

### 4. Start the Backend Server (Express + MCP)
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

### 5. Launch the React Dashboard
In a separate terminal tab:
```bash
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔒 Authentication & Per-User Security

### How Authentication Works:
1. **Request a JWT Token:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/token \
     -H "Content-Type: application/json" \
     -d '{"userId": "alice"}'
   ```
   *Response:*
   ```json
   {
     "message": "Token generated successfully",
     "userId": "alice",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "tokenType": "Bearer",
     "expiresIn": "7d"
   }
   ```

2. **Access Protected Endpoints:**
   Send the token in the `Authorization` header:
   ```bash
   curl http://localhost:3000/api/tasks \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **Per-User Isolation:**
   - Tasks created by User A (`alice`) are completely invisible and inaccessible to User B (`bob`).
   - If User B attempts to view, update, or delete User A's task, the API strictly returns `404 Not Found / Unauthorized`.

4. **Production Enforcement:**
   When `NODE_ENV=production`, unauthenticated requests without a valid Bearer token are strictly rejected with `401 Unauthorized`.

---

## 📡 REST API Reference

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description | Request Body / Query |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/token` | Issue signed JWT token | `{"userId": "your_user_id"}` |
| `GET` | `/tasks` | List user's tasks | Query: `?status=pending\|in-progress\|completed` |
| `GET` | `/tasks/stats` | Get user task count statistics | None |
| `GET` | `/tasks/:id` | Get single task by ID | Path param: `id` (24-hex string) |
| `POST` | `/tasks` | Create task | `{"title": "...", "description": "...", "status": "..."}` |
| `PATCH` | `/tasks/:id` | Update task fields | `{"status": "completed"}` |
| `DELETE` | `/tasks/:id` | Delete task | Path param: `id` |

---

## 🤖 MCP Tool & Resource Reference

The MCP Server communicates over standard `stdio` JSON-RPC:

### Available Tools:
1. **`get_tasks`**: Retrieve tasks with optional `status` filter (`pending`, `in-progress`, `completed`, or `null` for all) and optional `userId`.
2. **`get_task`**: Fetch a single task by MongoDB `id` and verify ownership.
3. **`create_task`**: Create a new task with `title`, `description`, `status`, and `userId`.
4. **`update_task`**: Partially update title, description, or status by `id`.
5. **`delete_task`**: Remove a task by `id`.

### Resource:
- **`tasks://stats`**: Real-time read-only JSON summary containing total, pending, in-progress, and completed counts.

### Prompt:
- **`weekly_task_report`**: Generates an executive task summary report segmented by status and action items.

---

## 🦙 Local AI Model Setup (Ollama + Qwen 2.5)

Run intelligent natural language task management 100% locally on your laptop without any GPU or cloud API keys!

### 1. Download the Local Model
```bash
ollama pull qwen2.5:3b
```
*(Takes ~1.9 GB disk space, runs blazingly fast on standard Intel / AMD Ryzen CPUs).*

### 2. Run the Interactive MCP Client
```bash
node ollamaClient.js
```

### 3. Try Natural Language Commands:
- *"Create a task to revise DBMS with description Chapter 1 to 4."*
- *"Show me all pending tasks."*
- *"Summarize my weekly progress."*
- *"Update task Revise DBMS to in-progress."*

The local LLM automatically maps user intent to MCP function calls, executes them on MongoDB, and returns synthesized answers.

---

## 🧪 Automated Testing Suite (22 / 22 Passing)

Run the automated test suite using Node's native test runner:
```bash
npm test
```

### Test Coverage Breakdown:
1. **Task CRUD & Validation Suite** (6 tests): Create, Read, Update, Delete, empty title rejection (400), invalid ObjectId rejection (400).
2. **Per-User Access Control** (6 tests): Cross-user data isolation, unauthorized read prevention, unauthorized update prevention, unauthorized delete prevention.
3. **Security & JWT Authentication** (2 tests): Signed token verification, invalid token rejection (401).
4. **MCP Tool Execution Suite** (8 tests): Stdio client connection, dynamic tool discovery, `create_task`, `get_tasks`, `update_task`, `delete_task`, and error handling for nonexistent IDs.

**All 22 tests pass with 0 failures.**

---

## 📄 License
MIT License. Built for fullstack agentic workflows.
