import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline";

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL_NAME = "qwen2.5:3b";

async function main() {
  console.log("Connecting to local MCP Task Manager Server...");

  // 1. Launch & connect to our MCP Server via stdio
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.js"],
  });

  const mcpClient = new Client(
    { name: "ollama-mcp-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await mcpClient.connect(transport);
  console.log("Connected to MCP Server!");

  // 2. Discover tools dynamically from our MCP Server
  const { tools } = await mcpClient.listTools();
  console.log(`Discovered ${tools.length} MCP tools:`, tools.map((t) => t.name).join(", "));

  // 3. Convert MCP tool schemas into Ollama function-calling format
  const ollamaTools = tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));

  // 4. Set up interactive chat session
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful personal task assistant connected to a MongoDB task manager via MCP tools. Always use the available tools to retrieve, create, update, or summarize tasks when asked. Respond concisely and clearly.",
    },
  ];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n=======================================================");
  console.log(" Local AI Assistant Ready (Powered by Ollama + MCP)");
  console.log(" Try asking:");
  console.log('   - "Create a task to revise DBMS."');
  console.log('   - "Show me all pending tasks."');
  console.log('   - "Summarize my weekly progress."');
  console.log(" Type 'exit' to quit.");
  console.log("=======================================================\n");

  const promptUser = () => {
    rl.question("\nYou: ", async (userInput) => {
      if (!userInput.trim()) return promptUser();
      if (userInput.toLowerCase() === "exit") {
        await mcpClient.close();
        rl.close();
        process.exit(0);
      }

      messages.push({ role: "user", content: userInput });

      try {
        process.stdout.write("AI thinking...");

        // Step A: Call Ollama with user message and MCP tools
        let response = await fetch(OLLAMA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_NAME,
            messages,
            tools: ollamaTools,
            stream: false,
          }),
        });

        let data = await response.json();
        let message = data.message;
        messages.push(message);

        // Clear "AI thinking..."
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        // Step B: Check if the local model decided to call any MCP tools
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const call of message.tool_calls) {
            const toolName = call.function.name;
            const toolArgs = call.function.arguments;

            console.log(`\n⚙️ [Local Model calling MCP Tool: ${toolName}] with args:`, JSON.stringify(toolArgs));

            // Execute tool on our MCP server
            const toolResult = await mcpClient.callTool({
              name: toolName,
              arguments: toolArgs,
            });

            const resultContent = toolResult.content
              .map((c) => (c.type === "text" ? c.text : JSON.stringify(c)))
              .join("\n");

            // Feed the tool output back into conversation history
            messages.push({
              role: "tool",
              content: resultContent,
            });
          }

          // Step C: Send tool result back to Ollama to generate the final natural response
          process.stdout.write("AI synthesizing response...");
          const finalRes = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL_NAME,
              messages,
              stream: false,
            }),
          });

          const finalData = await finalRes.json();
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);

          console.log(`\nAssistant: ${finalData.message.content}`);
          messages.push(finalData.message);
        } else {
          // Model responded directly without calling a tool
          console.log(`\nAssistant: ${message.content}`);
        }
      } catch (err) {
        console.error("\nError communicating with Ollama/MCP:", err.message);
      }

      promptUser();
    });
  };

  promptUser();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
