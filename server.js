import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Pinecone } from "@pinecone-database/pinecone";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Initialize Pinecone
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const namespace = pc
  .index("produtos", process.env.PINECONE_INDEX_HOST_URL)
  .namespace("produtos");

// Create the MCP server
const server = new McpServer({
  name: "mcp-farma-access",
  version: "1.0.0",
});

// Register the pinecone tool
server.tool(
  "query_products",
  "This tool accesses a vector database to provide knowledge about products. The tool returns a list of 10 products that match the query.",
  {
    query: z.string().describe("The query to search for products."),
  },
  async ({ query }) => {
    const response = await namespace.searchRecords({
      query: {
        topK: 10,
        inputs: { text: query },
      },
      fields: ["Produto_id", "ativo", "fabricante", "receita", "tarja"],
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  }
);

// Initialize web server
const app = express();

let transport = null;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (!transport) {
    res.status(500).send("Transport not initialized");
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.listen(6937, () => {
  console.log("Server is running on port http://localhost:6937/sse");
});
