#!/usr/bin/env node

const { spawn } = require('child_process');

// Criar processo do servidor MCP
const serverProcess = spawn('node', ['whatsapp-mcp/server-real.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Função para enviar mensagem JSON-RPC
function sendMessage(method, params = {}) {
  const message = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: method,
    params: params
  };
  
  serverProcess.stdin.write(JSON.stringify(message) + '\n');
}

// Escutar respostas do servidor
serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString().trim());
    console.log('Resposta do servidor:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('Dados recebidos:', data.toString());
  }
});

// Testar conexão e listar ferramentas
console.log('🔧 Testando conexão MCP...');

// Inicializar cliente
sendMessage('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: {
    name: 'test-client',
    version: '1.0.0'
  }
});

// Aguardar um pouco e depois listar ferramentas
setTimeout(() => {
  console.log('📋 Listando ferramentas disponíveis...');
  sendMessage('tools/list');
}, 2000);

// Aguardar e depois testar status do WhatsApp
setTimeout(() => {
  console.log('📱 Testando status do WhatsApp...');
  sendMessage('tools/call', {
    name: 'whatsapp_status_real',
    arguments: {}
  });
}, 4000);

// Aguardar e depois buscar contatos
setTimeout(() => {
  console.log('📞 Buscando contatos...');
  sendMessage('tools/call', {
    name: 'get_contacts_real',
    arguments: { limit: 10 }
  });
}, 6000);

// Encerrar após 10 segundos
setTimeout(() => {
  console.log('🔚 Encerrando teste...');
  serverProcess.kill();
  process.exit(0);
}, 10000);

process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});