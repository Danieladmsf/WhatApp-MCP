#!/usr/bin/env node

const { spawn } = require('child_process');

// Criar processo do servidor MCP
const serverProcess = spawn('node', ['whatsapp-mcp/server-real.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let requestId = 1;

// Função para enviar mensagem JSON-RPC
function sendMessage(method, params = {}) {
  const message = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params
  };
  
  console.log(`📤 Enviando: ${method}`);
  serverProcess.stdin.write(JSON.stringify(message) + '\n');
}

let initialized = false;
let ready = false;

// Escutar respostas do servidor
serverProcess.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString().trim());
    
    if (response.method === 'notifications/initialized') {
      console.log('✅ MCP inicializado');
      initialized = true;
      return;
    }
    
    if (response.result && response.result.content) {
      const text = response.result.content[0].text;
      console.log('📱 Status:', text);
      
      if (text.includes('WhatsApp REAL conectado')) {
        ready = true;
        console.log('🎉 WhatsApp conectado! Buscando contatos...');
        sendMessage('tools/call', {
          name: 'get_contacts_real',
          arguments: { limit: 15 }
        });
      }
    } else if (response.result && response.result.tools) {
      console.log(`📋 ${response.result.tools.length} ferramentas disponíveis`);
    } else {
      console.log('📥 Resposta:', JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.log('📝 Log:', data.toString().trim());
  }
});

// Inicializar
console.log('🚀 Iniciando cliente MCP...');

sendMessage('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: {
    name: 'contacts-client',
    version: '1.0.0'
  }
});

// Aguardar e verificar status periodicamente
let attempts = 0;
const maxAttempts = 20;

const checkStatus = () => {
  attempts++;
  console.log(`🔄 Tentativa ${attempts}/${maxAttempts} - Verificando status...`);
  
  sendMessage('tools/call', {
    name: 'whatsapp_status_real',
    arguments: {}
  });
  
  if (attempts < maxAttempts && !ready) {
    setTimeout(checkStatus, 3000);
  } else if (!ready) {
    console.log('❌ Tempo esgotado. WhatsApp pode não estar conectado.');
    serverProcess.kill();
    process.exit(1);
  }
};

// Iniciar verificação após inicialização
setTimeout(() => {
  sendMessage('tools/list');
  checkStatus();
}, 2000);

// Encerrar após 60 segundos
setTimeout(() => {
  console.log('⏰ Tempo limite alcançado');
  serverProcess.kill();
  process.exit(0);
}, 60000);

process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});