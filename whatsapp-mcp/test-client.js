import { Client } from "/home/user/studio/whatsapp-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "/home/user/studio/whatsapp-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { CallToolResultSchema } from "/home/user/studio/whatsapp-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/home/user/studio/whatsapp-mcp/server-real.js"],
  });

  const client = new Client({
    name: "TestClient",
    version: "1.0.0",
  });

  try {
    await client.connect(transport);
    console.log("✅ Cliente conectado ao servidor MCP.");

    console.log("🔄 Chamando a ferramenta: get_contacts_real...");
    const result = await client.callTool(
      {
        name: "get_contacts_real",
        arguments: { limit: 20 },
      },
      CallToolResultSchema
    );

    console.log("🎉 Resultado:");
    console.log(result.content[0].text);

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await client.close();
    console.log("🔌 Cliente desconectado.");
  }
}

main();