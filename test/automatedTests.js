import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import "dotenv/config";
import { taskService } from "../service/taskService.js";
import { Task } from "../models/Task.js";

const TEST_MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mcp_task_manager";

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

test.after(async () => {
  // Clean up any test tasks created by test users
  await Task.deleteMany({ userId: { $in: ["user_alice", "user_bob"] } });
  await mongoose.disconnect();
});

test.describe("Task Service & Per-User Authorization Tests", () => {
  let aliceTaskId;

  test("1. Create task for Alice", async () => {
    const task = await taskService.createTask(
      {
        title: "Alice Confidential Project",
        description: "Only Alice should see this",
        status: "pending",
      },
      "user_alice"
    );

    assert.ok(task._id);
    assert.equal(task.title, "Alice Confidential Project");
    assert.equal(task.userId, "user_alice");
    assert.equal(task.status, "pending");
    aliceTaskId = task._id.toString();
  });

  test("2. List tasks is strictly isolated per user", async () => {
    // Alice sees her task
    const aliceTasks = await taskService.getAllTasks({}, "user_alice");
    const foundAliceTask = aliceTasks.find((t) => t._id.toString() === aliceTaskId);
    assert.ok(foundAliceTask, "Alice should see her own task");

    // Bob cannot see Alice's task
    const bobTasks = await taskService.getAllTasks({}, "user_bob");
    const foundBobTask = bobTasks.find((t) => t._id.toString() === aliceTaskId);
    assert.equal(foundBobTask, undefined, "Bob must not see Alice's task");
  });

  test("3. User Bob cannot read Alice's task by ID (Unauthorized)", async () => {
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

  test("4. User Bob cannot update Alice's task (Unauthorized)", async () => {
    await assert.rejects(
      async () => {
        await taskService.updateTask(aliceTaskId, { status: "completed" }, "user_bob");
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );

    // Verify task status was NOT modified
    const unchangedTask = await taskService.getTaskById(aliceTaskId, "user_alice");
    assert.equal(unchangedTask.status, "pending");
  });

  test("5. Alice can successfully update her own task", async () => {
    const updated = await taskService.updateTask(
      aliceTaskId,
      { status: "in-progress", description: "Updated by Alice" },
      "user_alice"
    );
    assert.equal(updated.status, "in-progress");
    assert.equal(updated.description, "Updated by Alice");
  });

  test("6. Validation: Rejects empty title", async () => {
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

  test("7. Validation: Rejects invalid ObjectId format", async () => {
    await assert.rejects(
      async () => {
        await taskService.getTaskById("invalid-id-xyz", "user_alice");
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Invalid ID format/);
        return true;
      }
    );
  });

  test("8. User Bob cannot delete Alice's task", async () => {
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

  test("9. Alice can delete her own task", async () => {
    const deleted = await taskService.deleteTask(aliceTaskId, "user_alice");
    assert.equal(deleted._id.toString(), aliceTaskId);

    // Verify task is gone
    await assert.rejects(async () => {
      await taskService.getTaskById(aliceTaskId, "user_alice");
    });
  });

  test("10. Task statistics are strictly per-user", async () => {
    // Create 1 pending and 1 completed task for Alice
    const t1 = await taskService.createTask({ title: "Stats 1", status: "pending" }, "user_alice");
    const t2 = await taskService.createTask({ title: "Stats 2", status: "completed" }, "user_alice");

    const aliceStats = await taskService.getStats("user_alice");
    assert.equal(aliceStats.total, 2);
    assert.equal(aliceStats.breakdown.pending, 1);
    assert.equal(aliceStats.breakdown.completed, 1);

    const bobStats = await taskService.getStats("user_bob");
    assert.equal(bobStats.total, 0);

    // Clean up
    await taskService.deleteTask(t1._id.toString(), "user_alice");
    await taskService.deleteTask(t2._id.toString(), "user_alice");
  });
});
