import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { taskService } from "./service/taskService.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mcp_task_manager";
const PORT = process.env.API_PORT || process.env.PORT || 3000;

// =============================================================
// 1. EXPRESS REST API SETUP
// =============================================================
const app = express();
app.use(cors());
app.use(express.json());

// Mount the REST API routes
app.use("/api/auth", authRoutes);
app.use("/api", taskRoutes);

// Basic health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================================
// 2. MCP SERVER SETUP
// =============================================================
const server = new McpServer({
  name: "mcp-toolkit",
  version: "1.0.0",
});

// Tool 1: get_tasks (Uses shared taskService)
server.tool(
  "get_tasks",
  "Retrieve all tasks from MongoDB, optionally filtered by status",
  {
    status: z
      .enum(["pending", "in-progress", "completed"])
      .optional()
      .nullable()
      .describe("Optional status to filter by"),
    userId: z
      .string()
      .optional()
      .default("default_user")
      .describe("Optional user ID to scope tasks to"),
  },
  async ({ status, userId = "default_user" }) => {
    try {
      const filter = status ? { status } : {};
      const tasks = await taskService.getAllTasks(filter, userId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool 2: get_task (Uses shared taskService)
server.tool(
  "get_task",
  "Retrieve a single task from MongoDB by its ID",
  {
    id: z.string().describe("The MongoDB _id of the task to retrieve"),
    userId: z
      .string()
      .optional()
      .default("default_user")
      .describe("Optional user ID to verify task ownership"),
  },
  async ({ id, userId = "default_user" }) => {
    try {
      const task = await taskService.getTaskById(id, userId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool 3: create_task (Uses shared taskService)
server.tool(
  "create_task",
  "Create a new task in MongoDB",
  {
    title: z.string().min(1).describe("The title of the task"),
    description: z
      .string()
      .optional()
      .describe("Detailed description of the task"),
    status: z
      .enum(["pending", "in-progress", "completed"])
      .default("pending")
      .describe("Initial status of the task"),
    userId: z
      .string()
      .optional()
      .default("default_user")
      .describe("User ID the task belongs to"),
  },
  async ({ title, description = "", status = "pending", userId = "default_user" }) => {
    try {
      const newTask = await taskService.createTask(
        { title, description, status },
        userId
      );
      return {
        content: [
          {
            type: "text",
            text: `Task created successfully:\n${JSON.stringify(newTask, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool 4: update_task (Uses shared taskService)
server.tool(
  "update_task",
  "Update the title, description, or status of an existing task by MongoDB ID",
  {
    id: z.string().describe("The MongoDB _id of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    description: z
      .string()
      .optional()
      .describe("New description for the task"),
    status: z
      .enum(["pending", "in-progress", "completed"])
      .optional()
      .describe("New status for the task"),
    userId: z
      .string()
      .optional()
      .default("default_user")
      .describe("User ID to verify task ownership"),
  },
  async ({ id, title, description, status, userId = "default_user" }) => {
    try {
      const updatedTask = await taskService.updateTask(
        id,
        { title, description, status },
        userId
      );
      return {
        content: [
          {
            type: "text",
            text: `Task updated successfully:\n${JSON.stringify(updatedTask, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Tool 5: delete_task (Uses shared taskService)
server.tool(
  "delete_task",
  "Delete a task from MongoDB by its ID",
  {
    id: z.string().describe("The MongoDB _id of the task to delete"),
    userId: z
      .string()
      .optional()
      .default("default_user")
      .describe("User ID to verify task ownership"),
  },
  async ({ id, userId = "default_user" }) => {
    try {
      const deletedTask = await taskService.deleteTask(id, userId);
      return {
        content: [
          {
            type: "text",
            text: `Task "${deletedTask.title}" (${deletedTask._id}) deleted successfully.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Resource: Real-time stats (Uses shared taskService)
server.resource(
  "task-stats",
  "tasks://stats",
  {
    description: "Real-time statistics and summary of all tasks in MongoDB",
    mimeType: "application/json",
  },
  async (uri) => {
    const stats = await taskService.getStats("default_user");
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }
);

// Prompt: Weekly task report (Uses shared taskService)
server.prompt(
  "weekly_task_report",
  "Generate a structured weekly progress report summarizing current tasks",
  {
    focusArea: z
      .enum(["all", "pending", "in-progress", "completed"])
      .default("all")
      .describe("Focus area to summarize in the report"),
    teamMember: z
      .string()
      .optional()
      .describe("Name of the team member or lead generating the report"),
    userId: z
      .string()
      .optional()
      .default("default_user")
      .describe("User ID to generate report for"),
  },
  async ({ focusArea = "all", teamMember = "Team", userId = "default_user" }) => {
    const filter = focusArea === "all" ? {} : { status: focusArea };
    const tasks = await taskService.getAllTasks(filter, userId);

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an executive project assistant. Generate a structured Weekly Task Progress Report for ${teamMember}.

Focus Area: ${focusArea.toUpperCase()}

Here is the current live task data from the database:
${JSON.stringify(tasks, null, 2)}

Please format the report with:
1. Executive Summary (progress highlights)
2. Task Breakdown by Status
3. Key Blockers & Risks
4. Recommended Action Items for Next Week`,
          },
        },
      ],
    };
  }
);

// =============================================================
// 3. SERVER STARTUP (MongoDB + Express + MCP)
// =============================================================
async function main() {
  // 1. Connect to MongoDB
  console.error("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.error("MongoDB connected successfully!");

  // 2. Start Express REST API Server
  app.listen(PORT, () => {
    console.error(`Express REST API running at http://localhost:${PORT}/api/tasks`);
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use (Express API is already active).`);
    } else {
      console.error("Express server error:", err);
    }
  });

  // 3. Connect MCP stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Task Manager server running on stdio...");
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
