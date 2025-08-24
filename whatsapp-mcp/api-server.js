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
    }, 30000); // 30 seconds timeout
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
     res.status(500).json({ status: 'error', message: `MCP process has terminated with code ${mcpProcess.exitCode}. Please check logs or restart the server.` });
  }
});

// Get all contacts
// Helper to wrap async functions and catch errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function callMcpTool(toolName, args = {}) {
  return sendMcpRequest('tools/call', { name: toolName, arguments: args });
}

// Get all contacts
app.get('/contacts', asyncHandler(async (req, res) => {
  const result = await callMcpTool('get_contacts_real');
  res.status(200).json(result);
}));

// Get messages from a specific chat
app.get('/messages/:chatId', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 20;
  const result = await callMcpTool('get_messages_real', { chatId, limit });
  res.status(200).json(result);
}));

// Send a message
app.post('/send', asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Os campos \'phone\' e \'message\' são obrigatórios.' });
  }
  const result = await callMcpTool('send_message_real', { phone, message });
  res.status(200).json(result);
}));

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro na API:', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
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

const shutdown = async () => {
    console.log('Iniciando encerramento gracioso...');
    try {
        await sendMcpRequest('shutdown');
        console.log('Processo MCP encerrado com sucesso.');
    } catch (error) {
        console.error('Erro ao encerrar processo MCP:', error);
        mcpProcess.kill('SIGTERM');
    } finally {
        process.exit(0); // Exit after attempting graceful shutdown
    }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


