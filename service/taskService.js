import mongoose from "mongoose";
import { Task } from "../models/Task.js";

export const taskService = {
  // 1. Get all tasks for user (optional status filter)
  async getAllTasks(filter = {}, userId = "default_user") {
    const query = { userId };
    if (filter && filter.status) {
      query.status = filter.status;
    }
    return await Task.find(query).sort({ createdAt: -1 });
  },

  // 2. Get single task by ID and verify ownership
  async getTaskById(id, userId = "default_user") {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error(
        `Invalid ID format: "${id}". Must be a 24-character hexadecimal string.`
      );
      error.statusCode = 400;
      throw error;
    }
    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      const error = new Error(`Task with ID "${id}" was not found or unauthorized.`);
      error.statusCode = 404;
      throw error;
    }
    return task;
  },

  // 3. Create a new task tied to user
  async createTask({ title, description = "", status = "pending" }, userId = "default_user") {
    if (!title || typeof title !== "string" || !title.trim()) {
      const error = new Error("Field 'title' is required.");
      error.statusCode = 400;
      throw error;
    }
    return await Task.create({
      userId,
      title: title.trim(),
      description,
      status,
    });
  },

  // 4. Update task by ID and verify ownership
  async updateTask(id, updateData, userId = "default_user") {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error(
        `Invalid ID format: "${id}". Must be a 24-character hexadecimal string.`
      );
      error.statusCode = 400;
      throw error;
    }

    const allowedUpdates = {};
    if (updateData.title !== undefined) allowedUpdates.title = updateData.title.trim();
    if (updateData.description !== undefined) allowedUpdates.description = updateData.description;
    if (updateData.status !== undefined) allowedUpdates.status = updateData.status;

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      allowedUpdates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      const error = new Error(`Task with ID "${id}" was not found or unauthorized.`);
      error.statusCode = 404;
      throw error;
    }
    return task;
  },

  // 5. Delete task by ID and verify ownership
  async deleteTask(id, userId = "default_user") {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error(
        `Invalid ID format: "${id}". Must be a 24-character hexadecimal string.`
      );
      error.statusCode = 400;
      throw error;
    }

    const task = await Task.findOneAndDelete({ _id: id, userId });
    if (!task) {
      const error = new Error(`Task with ID "${id}" was not found or unauthorized.`);
      error.statusCode = 404;
      throw error;
    }
    return task;
  },

  // 6. Get task statistics for user
  async getStats(userId = "default_user") {
    const total = await Task.countDocuments({ userId });
    const pending = await Task.countDocuments({ userId, status: "pending" });
    const inProgress = await Task.countDocuments({ userId, status: "in-progress" });
    const completed = await Task.countDocuments({ userId, status: "completed" });

    return {
      total,
      breakdown: { pending, inProgress, completed },
      generatedAt: new Date().toISOString(),
    };
  },
};
