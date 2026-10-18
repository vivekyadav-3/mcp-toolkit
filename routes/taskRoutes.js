import { Router } from "express";
import { taskService } from "../service/taskService.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Apply authentication middleware to all task routes
router.use(authenticate);

// 1. GET /api/tasks - Retrieve all tasks for current user
router.get("/tasks", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const tasks = await taskService.getAllTasks(filter, req.userId);
    res.json(tasks);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// 2. GET /api/tasks/stats - Get statistics for current user
router.get("/tasks/stats", async (req, res) => {
  try {
    const stats = await taskService.getStats(req.userId);
    res.json(stats);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// 3. GET /api/tasks/:id - Retrieve a single task by ID
router.get("/tasks/:id", async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.userId);
    res.json(task);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// 4. POST /api/tasks - Create a new task tied to current user
router.post("/tasks", async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const newTask = await taskService.createTask(
      { title, description, status },
      req.userId
    );
    res.status(201).json(newTask);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

// 5. PATCH /api/tasks/:id - Update an existing task
router.patch("/tasks/:id", async (req, res) => {
  try {
    const updatedTask = await taskService.updateTask(
      req.params.id,
      req.body,
      req.userId
    );
    res.json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

// 6. DELETE /api/tasks/:id - Delete a task
router.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await taskService.deleteTask(req.params.id, req.userId);
    res.json({
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
