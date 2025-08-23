
import express from 'express';
import { Client } from "/home/user/studio/whatsapp-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "/home/user/studio/whatsapp-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { CallToolResultSchema } from "/home/user/studio/whatsapp-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js";

// --- Configuração --- 
const API_PORT = 3001;
const MCP_SERVER_SCRIPT = '/home/user/studio/whatsapp-mcp/server-real.js';

// --- Cliente MCP Global ---
let mcpClient;
let isMcpReady = false;

async function connectToMcp() {
  console.log('Iniciando conexão com o servidor MCP...');
  
  const transport = new StdioClientTransport({
    command: "node",
    args: [MCP_SERVER_SCRIPT],
    stderr: "pipe",
  });

  mcpClient = new Client({
    name: "ApiTestClient",
    version: "1.0.0",
  });

  // Escuta os logs do servidor para saber quando ele está pronto
  transport.stderr.on("data", (data) => {
    const message = data.toString();
    console.log(`[MCP Server Log]: ${message.trim()}`);
    if (message.includes("SERVIDOR PRONTO")) {
      isMcpReady = true;
      console.log('✅ Conexão com WhatsApp estabelecida e pronta para uso!');
    }
    if (message.includes("QR CODE")) {
        console.log('‼️ Servidor MCP pediu um novo QR Code. Por favor, reinicie e escaneie o código no terminal do servidor.');
        isMcpReady = false;
    }
  });

  await mcpClient.connect(transport);
  console.log('Ponte de API conectada ao processo do servidor MCP.');
}

// --- Servidor da API --- 
const app = express();
app.use(express.json());

app.get('/status', (req, res) => {
  if (isMcpReady) {
    res.status(200).json({ status: 'pronto', message: 'Conectado ao WhatsApp.' });
  } else {
    res.status(503).json({ status: 'ocupado', message: 'Aguardando conexão com o WhatsApp. Tente novamente em alguns segundos.' });
  }
});

app.get('/contatos', async (req, res) => {
  if (!isMcpReady) {
    return res.status(503).json({ error: 'Servidor não está pronto.' });
  }
  try {
    const result = await mcpClient.callTool({ name: 'get_contacts_real', arguments: { limit: 20 } });
    res.status(200).json(result.content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/enviar', async (req, res) => {
  if (!isMcpReady) {
    return res.status(503).json({ error: 'Servidor não está pronto.' });
  }
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Parâmetros "phone" e "message" são obrigatórios.' });
  }
  try {
    const result = await mcpClient.callTool({ name: 'send_message_real', arguments: { phone, message } });
    res.status(200).json(result.content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Iniciar tudo ---
app.listen(API_PORT, () => {
  console.log(`🚀 Servidor da API de teste rodando em http://localhost:${API_PORT}`);
  connectToMcp().catch(err => {
      console.error('Falha crítica ao conectar com o servidor MCP:', err);
      process.exit(1);
  });
});
