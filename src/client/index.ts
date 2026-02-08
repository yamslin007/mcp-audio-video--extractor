import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";
import * as readline from "readline";
import "dotenv/config";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// Convert MCP tools to OpenAI function calling format
function mcpToolsToOpenAI(mcpTools: McpTool[]): OpenAI.ChatCompletionTool[] {
  return mcpTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.inputSchema || { type: "object", properties: {} },
    },
  }));
}

async function main() {
  // Check API key
  if (!process.env.MOONSHOT_API_KEY) {
    console.error("Error: MOONSHOT_API_KEY not found in environment");
    console.error("Please create a .env file with your API key");
    process.exit(1);
  }

  // Initialize OpenAI client for Kimi K2 (must be after dotenv loads)
  const openai = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
  });

  console.log("Starting MCP Subtitle Client...\n");

  // Start MCP server as subprocess with environment variables
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/server/index.ts"],
    env: {
      ...process.env,  // Pass all environment variables to subprocess
    },
  });

  const client = new Client({
    name: "subtitle-client",
    version: "1.0.0",
  });

  await client.connect(transport);
  console.log("Connected to MCP server\n");

  // Get available tools
  const toolsResponse = await client.listTools();
  const mcpTools = toolsResponse.tools as McpTool[];
  const openaiTools = mcpToolsToOpenAI(mcpTools);

  console.log("Available tools:");
  mcpTools.forEach((t) => console.log(`  - ${t.name}: ${t.description}`));
  console.log("\n");

  // Setup readline for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (prompt: string): Promise<string> => {
    return new Promise((resolve) => rl.question(prompt, resolve));
  };

  // Message history
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that can extract subtitles from online videos. " +
        "Use the available tools to help users extract subtitles or list available languages. " +
        "When extracting subtitles, confirm the result with the user.",
    },
  ];

  console.log('Enter your request (or "quit" to exit):\n');

  // Main conversation loop
  while (true) {
    const userInput = await askQuestion("You: ");

    if (userInput.toLowerCase() === "quit" || userInput.toLowerCase() === "exit") {
      console.log("Goodbye!");
      break;
    }

    if (!userInput.trim()) continue;

    messages.push({ role: "user", content: userInput });

    // Agentic loop - keep calling LLM until we get a final response
    while (true) {
      try {
        const response = await openai.chat.completions.create({
          model: "kimi-k2-thinking-turbo",
          temperature: 0.6,
          messages,
          tools: openaiTools,
          tool_choice: "auto",
        });

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        // Add assistant message to history
        messages.push(assistantMessage);

        // Check if we need to call tools
        if (choice.finish_reason === "tool_calls" && assistantMessage.tool_calls) {
          console.log("\n[Calling tools...]");

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            console.log(`  → ${toolName}(${JSON.stringify(toolArgs)})`);

            // Call the tool via MCP
            const result = await client.callTool({
              name: toolName,
              arguments: toolArgs,
            });

            // Extract text content from result
            const resultText =
              result.content
                ?.filter((c): c is { type: "text"; text: string } => c.type === "text")
                .map((c) => c.text)
                .join("\n") || "No result";

            console.log(`  ← Result received\n`);

            // Add tool result to messages
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: resultText,
            });
          }
          // Continue the loop to get LLM's response to tool results
          continue;
        }

        // Final response - print and break inner loop
        if (assistantMessage.content) {
          console.log(`\nAssistant: ${assistantMessage.content}\n`);
        }
        break;
      } catch (error) {
        console.error("\nError calling API:", error instanceof Error ? error.message : error);
        // Remove the last user message on error
        messages.pop();
        break;
      }
    }
  }

  rl.close();
  await client.close();
}

main().catch(console.error);
