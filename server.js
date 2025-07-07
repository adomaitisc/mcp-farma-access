import express from "express";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { Pinecone } from "@pinecone-database/pinecone";
import redis from "redis";

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const app = express();
let transport = null;
const server = new McpServer({
  name: "mcp-farma-access",
  version: "1.0.0",
});
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
const pineconNamespace = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  .index("produtos", process.env.PINECONE_INDEX_HOST_URL)
  .namespace("produtos");

server.tool(
  // Product Similarity Search with Text Embeddings on a Vector Database
  "query_products",
  "This tool accesses a vector database to provide knowledge about products. The tool returns a list of 10 products that match the query, it includes Produto_id, prices and other information.",
  {
    query: z.string().describe("The query to search for products."),
  },
  async ({ query }) => {
    const response = await pineconNamespace.searchRecords({
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

server.tool(
  // Product Inventory Query with Real Time Data on Redis
  "product_inventory",
  "This tool accesses a redis database to provide the real time inventory of a product. The id must be the Produto_id from the database.",
  {
    product_id: z.string().describe("The product id to search for."),
  },
  async ({ product_id }) => {
    const response = await redisClient.get(product_id);
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  }
);

server.tool(
  // Product Inventory Query with Real Time Data on Redis
  "many_products_inventory",
  "This tool accesses a redis database to provide the real time inventory of many products. The id must be the Produto_id from the database.",
  {
    product_ids: z.array(z.string()).describe("The product ids to search for."),
  },
  async ({ product_ids }) => {
    const response = await redisClient.mGet(product_ids);
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  }
);

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
