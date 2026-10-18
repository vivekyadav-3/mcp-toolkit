import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import "dotenv/config";
import { taskService } from "../service/taskService.js";
import { Task } from "../models/Task.js";
import { generateToken, authenticate } from "../middleware/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const TEST_MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mcp_task_manager";

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

test.after(async () => {
  // Clean up any test tasks created by test users
  await Task.deleteMany({ userId: { $in: ["user_alice", "user_bob", "jwt_user", "mcp_test_user"] } });
  await mongoose.disconnect();
});

test.describe("1. Task CRUD & Validation Suite", () => {
  let createdTaskId;

  test("Create: creates task with valid inputs", async () => {
    const task = await taskService.createTask(
      {
        title: "Complete System Design",
        description: "Draft diagrams and endpoints",
        status: "pending",
      },
      "user_alice"
    );

    assert.ok(task._id);
    assert.equal(task.title, "Complete System Design");
    assert.equal(task.userId, "user_alice");
    assert.equal(task.status, "pending");
    createdTaskId = task._id.toString();
  });

  test("Read: retrieves existing task by ID", async () => {
    const task = await taskService.getTaskById(createdTaskId, "user_alice");
    assert.equal(task.title, "Complete System Design");
  });

  test("Update: updates task status and fields", async () => {
    const updated = await taskService.updateTask(
      createdTaskId,
      { status: "in-progress", description: "In review" },
      "user_alice"
    );
    assert.equal(updated.status, "in-progress");
    assert.equal(updated.description, "In review");
  });

  test("Delete: removes task from database", async () => {
    const deleted = await taskService.deleteTask(createdTaskId, "user_alice");
    assert.equal(deleted._id.toString(), createdTaskId);

    // Confirm deletion
    await assert.rejects(async () => {
      await taskService.getTaskById(createdTaskId, "user_alice");
    });
  });

  test("Validation: Rejects empty title", async () => {
    await assert.rejects(
      async () => {
        await taskService.createTask({ title: "   " }, "user_alice");
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Field 'title' is required/);
        return true;
      }
    );
  });

  test("Validation: Rejects malformed 24-character ObjectId", async () => {
    await assert.rejects(
      async () => {
        await taskService.getTaskById("not-a-valid-id-123", "user_alice");
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Invalid ID format/);
        return true;
      }
    );
  });
});

test.describe("2. Per-User Access Control & Authorization", () => {
  let aliceTaskId;

  test("Alice creates confidential task", async () => {
    const task = await taskService.createTask(
      { title: "Alice Confidential", status: "pending" },
      "user_alice"
    );
    aliceTaskId = task._id.toString();
    assert.ok(aliceTaskId);
  });

  test("Data Isolation: Bob cannot see Alice's task in task list", async () => {
    const bobTasks = await taskService.getAllTasks({}, "user_bob");
    const found = bobTasks.find((t) => t._id.toString() === aliceTaskId);
    assert.equal(found, undefined, "Bob must not see Alice's task");
  });

  test("Access Control: Bob cannot read Alice's task by ID (404/Unauthorized)", async () => {
    await assert.rejects(
      async () => {
        await taskService.getTaskById(aliceTaskId, "user_bob");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /unauthorized|not found/i);
        return true;
      }
    );
  });

  test("Access Control: Bob cannot update Alice's task", async () => {
    await assert.rejects(
      async () => {
        await taskService.updateTask(aliceTaskId, { status: "completed" }, "user_bob");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  test("Access Control: Bob cannot delete Alice's task", async () => {
    await assert.rejects(
      async () => {
        await taskService.deleteTask(aliceTaskId, "user_bob");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  test("Clean up: Alice can delete her own task", async () => {
    const deleted = await taskService.deleteTask(aliceTaskId, "user_alice");
    assert.equal(deleted._id.toString(), aliceTaskId);
  });
});

test.describe("3. Security & Production JWT Authentication", () => {
  test("Issues valid signed JWT token and authenticates request", async () => {
    const token = generateToken("jwt_user");
    assert.ok(token);

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    let nextCalled = false;
    const res = {
      status: () => res,
      json: () => res,
    };
    const next = () => {
      nextCalled = true;
    };

    authenticate(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(req.userId, "jwt_user");
  });

  test("Rejects malformed or invalid JWT token with 401", async () => {
    const req = {
      headers: { authorization: "Bearer invalid.fake.token" },
    };
    let capturedStatus = null;
    let capturedJson = null;
    const res = {
      status: (code) => {
        capturedStatus = code;
        return res;
      },
      json: (data) => {
        capturedJson = data;
        return res;
      },
    };
    const next = () => {};

    authenticate(req, res, next);
    assert.equal(capturedStatus, 401);
    assert.match(capturedJson.error, /Unauthorized/);
  });
});

test.describe("4. MCP Tool Execution Suite", () => {
  let mcpClient;
  let transport;
  let mcpCreatedId;

  test("Connects to MCP Server over stdio", async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: ["server.js"],
    });
    mcpClient = new Client({ name: "test-mcp-client", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    assert.ok(mcpClient);
  });

  test("Discovers required MCP tools", async () => {
    const { tools } = await mcpClient.listTools();
    const toolNames = tools.map((t) => t.name);
    assert.ok(toolNames.includes("create_task"));
    assert.ok(toolNames.includes("get_tasks"));
    assert.ok(toolNames.includes("update_task"));
    assert.ok(toolNames.includes("delete_task"));
  });

  test("MCP: create_task tool executes and persists in MongoDB", async () => {
    const result = await mcpClient.callTool({
      name: "create_task",
      arguments: {
        title: "Automated MCP Task",
        description: "Created in test suite",
        status: "pending",
        userId: "mcp_test_user",
      },
    });

    assert.equal(result.isError, undefined);
    const text = result.content[0].text;
    assert.match(text, /Automated MCP Task/);

    // Extract ID for subsequent tests
    const parsed = JSON.parse(text.replace(/Task created successfully:\n/, ""));
    mcpCreatedId = parsed._id;
    assert.ok(mcpCreatedId);
  });

  test("MCP: get_tasks tool filters by status and user", async () => {
    const result = await mcpClient.callTool({
      name: "get_tasks",
      arguments: {
        status: "pending",
        userId: "mcp_test_user",
      },
    });

    assert.equal(result.isError, undefined);
    const tasks = JSON.parse(result.content[0].text);
    assert.ok(Array.isArray(tasks));
    const found = tasks.find((t) => t._id === mcpCreatedId);
    assert.ok(found);
  });

  test("MCP: update_task tool modifies task status", async () => {
    const result = await mcpClient.callTool({
      name: "update_task",
      arguments: {
        id: mcpCreatedId,
        status: "completed",
        userId: "mcp_test_user",
      },
    });

    assert.equal(result.isError, undefined);
    assert.match(result.content[0].text, /completed/);
  });

  test("MCP: delete_task tool removes task", async () => {
    const result = await mcpClient.callTool({
      name: "delete_task",
      arguments: {
        id: mcpCreatedId,
        userId: "mcp_test_user",
      },
    });

    assert.equal(result.isError, undefined);
    assert.match(result.content[0].text, /deleted successfully/);
  });

  test("MCP: Error handling returns isError true for nonexistent ID", async () => {
    const result = await mcpClient.callTool({
      name: "delete_task",
      arguments: {
        id: "000000000000000000000000",
        userId: "mcp_test_user",
      },
    });

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Error: Task with ID .* was not found/);
  });

  test("Clean up: Closes MCP client connection", async () => {
    await mcpClient.close();
  });
});
