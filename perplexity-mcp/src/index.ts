#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
if (!PERPLEXITY_API_KEY) {
  throw new Error("PERPLEXITY_API_KEY environment variable is required");
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

class PerplexityServer {
  private server: Server;
  private axiosInstance;
  private db: Database.Database;

  constructor() {
    this.server = new Server(
      {
        name: "perplexity-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: "https://api.perplexity.ai",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // Initialize SQLite database
    const dbPath = join(homedir(), ".perplexity-mcp", "chat_history.db");

    // Ensure the directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir);
    }

    this.db = new Database(dbPath, { fileMustExist: false });
    this.initializeDatabase();

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      this.db.close();
      await this.server.close();
      process.exit(0);
    });
  }

  private initializeDatabase() {
    // Create chats table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
      )
    `);
  }

  private getChatHistory(chatId: string): ChatMessage[] {
    const messages = this.db.prepare(
      "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC"
    ).all(chatId);
    return messages as ChatMessage[];
  }

  private saveChatMessage(chatId: string, message: ChatMessage) {
    // Ensure chat exists
    this.db.prepare(
      "INSERT OR IGNORE INTO chats (id) VALUES (?)"
    ).run(chatId);

    // Save message
    this.db.prepare(
      "INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)"
    ).run(chatId, message.role, message.content);
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "chat_perplexity",
          description: "Maintains ongoing conversations with Perplexity AI. Creates new chats or continues existing ones with full history context.",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message to send to Perplexity AI"
              },
              chat_id: {
                type: "string",
                description: "Optional: ID of an existing chat to continue. If not provided, a new chat will be created."
              }
            },
            required: ["message"]
          }
        },
        {
          name: "search",
          description: "Perform a general search query to get comprehensive information on any topic",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query or question"
              },
              detail_level: {
                type: "string",
                description: "Optional: Desired level of detail (brief, normal, detailed)",
                enum: ["brief", "normal", "detailed"]
              }
            },
            required: ["query"]
          }
        },
        {
          name: "get_documentation",
          description: "Get documentation and usage examples for a specific technology, library, or API",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The technology, library, or API to get documentation for"
              },
              context: {
                type: "string",
                description: "Additional context or specific aspects to focus on"
              }
            },
            required: ["query"]
          }
        },
        {
          name: "find_apis",
          description: "Find and evaluate APIs that could be integrated into a project",
          inputSchema: {
            type: "object",
            properties: {
              requirement: {
                type: "string",
                description: "The functionality or requirement you're looking to fulfill"
              },
              context: {
                type: "string",
                description: "Additional context about the project or specific needs"
              }
            },
            required: ["requirement"]
          }
        },
        {
          name: "check_deprecated_code",
          description: "Check if code or dependencies might be using deprecated features",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The code snippet or dependency to check"
              },
              technology: {
                type: "string",
                description: "The technology or framework context (e.g., 'React', 'Node.js')"
              }
            },
            required: ["code"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "chat_perplexity": {
            const { message, chat_id = crypto.randomUUID() } = request.params.arguments as { 
              message: string; 
              chat_id?: string;
            };

            // Get chat history
            const history = this.getChatHistory(chat_id);
            
            // Add new user message
            const userMessage: ChatMessage = { role: "user", content: message };
            this.saveChatMessage(chat_id, userMessage);

            // Prepare messages array with history
            const messages = [...history, userMessage];

            // Call Perplexity API
            const response = await this.axiosInstance.post("/chat/completions", {
              model: "sonar-reasoning-pro",
              messages,
            });

            // Save assistant's response
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: response.data.choices[0].message.content,
            };
            this.saveChatMessage(chat_id, assistantMessage);

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  chat_id,
                  response: assistantMessage.content
                }, null, 2)
              }]
            };
          }

          case "get_documentation": {
            const { query, context = "" } = request.params.arguments as { query: string; context?: string };
            const prompt = `Provide comprehensive documentation and usage examples for ${query}. ${context ? `Focus on: ${context}` : ""} Include:
            1. Basic overview and purpose
            2. Key features and capabilities
            3. Installation/setup if applicable
            4. Common usage examples
            5. Best practices
            6. Common pitfalls to avoid
            7. Links to official documentation if available`;

            const response = await this.axiosInstance.post("/chat/completions", {
              model: "sonar-reasoning-pro",
              messages: [{ role: "user", content: prompt }],
            });

            return {
              content: [{
                type: "text",
                text: response.data.choices[0].message.content
              }]
            };
          }

          case "find_apis": {
            const { requirement, context = "" } = request.params.arguments as { requirement: string; context?: string };
            const prompt = `Find and evaluate APIs that could be used for: ${requirement}. ${context ? `Context: ${context}` : ""} For each API, provide:
            1. Name and brief description
            2. Key features and capabilities
            3. Pricing model (if available)
            4. Integration complexity
            5. Documentation quality
            6. Community support and popularity
            7. Any potential limitations or concerns
            8. Code example of basic usage`;

            const response = await this.axiosInstance.post("/chat/completions", {
              model: "sonar-reasoning-pro",
              messages: [{ role: "user", content: prompt }],
            });

            return {
              content: [{
                type: "text",
                text: response.data.choices[0].message.content
              }]
            };
          }

          case "check_deprecated_code": {
            const { code, technology = "" } = request.params.arguments as { code: string; technology?: string };
            const prompt = `Analyze this code for deprecated features or patterns${technology ? ` in ${technology}` : ""}:

            ${code}

            Please provide:
            1. Identification of any deprecated features, methods, or patterns
            2. Current recommended alternatives
            3. Migration steps if applicable
            4. Impact of the deprecation
            5. Timeline of deprecation if known
            6. Code examples showing how to update to current best practices`;

            const response = await this.axiosInstance.post("/chat/completions", {
              model: "sonar-reasoning-pro",
              messages: [{ role: "user", content: prompt }],
            });

            return {
              content: [{
                type: "text",
                text: response.data.choices[0].message.content
              }]
            };
          }

          case "search": {
            const { query, detail_level = "normal" } = request.params.arguments as { query: string; detail_level?: "brief" | "normal" | "detailed" };
            
            let prompt = query;
            switch (detail_level) {
              case "brief":
                prompt = `Provide a brief, concise answer to: ${query}`;
                break;
              case "detailed":
                prompt = `Provide a comprehensive, detailed analysis of: ${query}. Include relevant examples, context, and supporting information where applicable.`;
                break;
              default:
                prompt = `Provide a clear, balanced answer to: ${query}. Include key points and relevant context.`;
            }

            const response = await this.axiosInstance.post("/chat/completions", {
              model: "sonar-reasoning-pro",
              messages: [{ role: "user", content: prompt }],
            });

            return {
              content: [{
                type: "text",
                text: response.data.choices[0].message.content
              }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `Perplexity API error: ${error.response?.data?.error?.message || error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Perplexity MCP server running on stdio");
  }
}

const server = new PerplexityServer();
server.run().catch(console.error);
