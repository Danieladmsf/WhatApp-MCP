import { spawn } from 'child_process';
import express from 'express';
import { randomUUID } from 'crypto';

// --- 1. Spawn and manage the core MCP process ---
console.log('Iniciando o processo principal MCP (server-real.js)...');
const mcpProcess = spawn('node', ['server-real.js'], {
  cwd: import.meta.dirname, // Run from the same directory
  stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, inherit stderr
});

// --- 2. Manage JSON-RPC communication ---
const pendingRequests = new Map();

mcpProcess.stdout.on('data', (data) => {
  const dataStr = data.toString().trim();
  // The process can output multiple JSON objects in one chunk
  dataStr.split('\n').forEach(line => {
    try {
      const response = JSON.parse(line);
      if (response.id && pendingRequests.has(response.id)) {
        const { resolve, reject } = pendingRequests.get(response.id);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
        pendingRequests.delete(response.id);
      } else {
        console.log('Mensagem não solicitada do MCP:', response);
      }
    } catch (e) {
      console.log('Saída não-JSON do processo MCP:', line);
    }
  });
});

mcpProcess.on('exit', (code) => {
  console.error(`Processo MCP (server-real.js) encerrou com código ${code}`);
});

function sendMcpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const message = { jsonrpc: '2.0', id, method, params };
    pendingRequests.set(id, { resolve, reject });
    mcpProcess.stdin.write(JSON.stringify(message) + '\n');

    // Timeout to prevent requests from hanging forever
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        reject(new Error('A requisição para o MCP expirou.'));
        pendingRequests.delete(id);
      }
    }, 15000); // 15 seconds timeout
  });
}

// --- 3. Create Express API Server ---
const app = express();
app.use(express.json());
const port = 3001;

// --- 4. Define API Endpoints ---

// Health check endpoint
app.get('/status', (req, res) => {
  if (mcpProcess.exitCode === null) {
     res.status(200).json({ status: 'ok', message: 'API server is running and MCP process is alive.' });
  } else {
     res.status(500).json({ status: 'error', message: `MCP process has terminated with code ${mcpProcess.exitCode}.` });
  }
});

// Get all contacts
app.get('/contacts', async (req, res) => {
  try {
    const result = await sendMcpRequest('tools/call', { name: 'get_contacts_real', arguments: {} });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages from a specific chat
app.get('/messages/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const result = await sendMcpRequest('tools/call', { name: 'get_messages_real', arguments: { chatId, limit } });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send a message
app.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Os campos \'phone\' e \'message\' são obrigatórios.' });
    }
    const result = await sendMcpRequest('tools/call', { name: 'send_message_real', arguments: { phone, message } });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 5. Start the server ---
app.listen(port, () => {
  console.log(`✅ Servidor da API do WhatsApp rodando em http://localhost:${port}`);
  // Initialize the MCP connection
  console.log('Inicializando conexão MCP...');
  sendMcpRequest('initialize', { protocolVersion: '2024-11-05' })
    .then(res => console.log('Conexão MCP inicializada:', res))
    .catch(err => console.error('Erro ao inicializar MCP:', err));
});

process.on('SIGINT', () => process.exit());
process.on('exit', () => {
    console.log('Encerrando processo MCP...');
    mcpProcess.kill();
});
