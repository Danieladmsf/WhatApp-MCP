#!/usr/bin/env node

import express from 'express';
import pkg from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;
const API_PORT = 3001;

class WhatsAppServer {
  constructor() {
    this.whatsappClient = null;
    this.isReady = false;
  }

  async initializeWhatsApp() {
    try {
      console.error('🚀 Conectando ao WhatsApp Web autenticado...');
      
      this.whatsappClient = new Client({
        authStrategy: new LocalAuth({
          dataPath: '/home/user/studio/whatsapp-mcp/whatsapp-session'
        }),
        puppeteer: {
          executablePath: '/google/idx/builtins/bin/chromium-browser',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor,TranslateUI',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--memory-pressure-off',
            '--max_old_space_size=1024',
            '--headless=new',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--single-process'
          ],
          headless: true,
          timeout: 180000,
          protocolTimeout: 180000,
          defaultViewport: { width: 1280, height: 720 },
          ignoreDefaultArgs: ['--disable-extensions'],
          handleSIGINT: false,
          handleSIGTERM: false,
          handleSIGHUP: false
        }
      });

      this.whatsappClient.on('qr', (qr) => {
        console.error('QR Code recebido. Exibindo no terminal:');
        qrcodeTerminal.generate(qr, { small: true });
        console.error('Escaneie o QR Code acima com o WhatsApp do seu celular.');
      });

      this.whatsappClient.on('ready', () => {
        console.error('✅ WhatsApp conectado! Servidor de API pronto.');
        this.isReady = true;
      });

      this.whatsappClient.on('authenticated', () => {
        console.error('🔑 WhatsApp autenticado - usando sessão existente');
      });

      this.whatsappClient.on('disconnected', (reason) => {
        console.error('❌ WhatsApp desconectado:', reason);
        this.isReady = false;
      });

      await this.whatsappClient.initialize();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp real:', error);
      throw error;
    }
  }

  async sendMessageReal(phone, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp não está conectado.');
    }
    await this.whatsappClient.sendMessage(phone, message);
    return { success: true, message: `✅ Mensagem real enviada para ${phone}: ${message}` };
  }

  async getContactsReal(limit = 20) {
    if (!this.isReady) {
      throw new Error('WhatsApp não está conectado.');
    }
    const contacts = await this.whatsappClient.getContacts();
    const realContacts = contacts
      .filter(contact => contact.isMyContact)
      .slice(0, limit)
      .map(contact => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname || 'Sem nome',
        number: contact.number,
        isBlocked: contact.isBlocked || false,
        profilePicUrl: contact.profilePicUrl || null
      }));
    return realContacts;
  }

  async getChatsReal(limit = 10) {
    if (!this.isReady) {
        throw new Error('WhatsApp não está conectado.');
    }
    const chats = await this.whatsappClient.getChats();
    const realChats = chats.slice(0, limit).map(chat => ({
        id: chat.id._serialized,
        name: chat.name || 'Chat sem nome',
        lastMessage: chat.lastMessage?.body || 'Nenhuma mensagem',
        timestamp: chat.lastMessage?.timestamp 
          ? new Date(chat.lastMessage.timestamp * 1000).toLocaleString('pt-BR')
          : 'N/A',
        unreadCount: chat.unreadCount || 0,
        isGroup: chat.isGroup || false
      }));
    return realChats;
  }

  async getMessagesReal(chatId, limit = 10) {
    if (!this.isReady) {
        throw new Error('WhatsApp não está conectado.');
    }
    const chat = await this.whatsappClient.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: limit });
    
    const realMessages = messages.map(msg => ({
      id: msg.id._serialized,
      body: msg.body || '[Mídia/Anexo]',
      from: msg.from,
      timestamp: new Date(msg.timestamp * 1000).toLocaleString('pt-BR'),
      fromMe: msg.fromMe,
      type: msg.type || 'chat',
      author: msg.author || null
    }));
    return realMessages;
  }

  getWhatsAppStatus() {
    return {
      isReady: this.isReady,
      message: this.isReady ? '✅ WhatsApp REAL conectado e funcionando' : '❌ WhatsApp não conectado. Aguardando conexão com sessão autenticada...'
    };
  }
}

// --- Inicia o servidor e o handler de comunicação JSON-RPC ---

import readline from 'readline';

const server = new WhatsAppServer();

// Inicializa o WhatsApp assim que o script começa.
server.initializeWhatsApp().catch(err => {
    console.error("Erro fatal na inicialização do WhatsApp:", err);
    process.exit(1);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

const snakeToCamel = (str) => str.toLowerCase().replace(/([-_][a-z])/g, group =>
  group.toUpperCase()
    .replace('-', '')
    .replace('_', '')
);

rl.on('line', async (line) => {
    let request;
    try {
        request = JSON.parse(line);
    } catch (e) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }) + '\n');
        return;
    }

    const { method, params, id } = request;
    let result, error;

    if (method === 'initialize') {
        result = { success: true, message: "Inicialização já concluída ou em progresso." };
    } else if (method === 'tools/call') {
        const { name, arguments: args } = params;
        
        const functionName = snakeToCamel(name);

        if (typeof server[functionName] === 'function') {
            try {
                result = await server[functionName](...(Object.values(args)));
            } catch (e) {
                error = { code: -32000, message: e.message };
            }
        } else {
            error = { code: -32601, message: `Método '${functionName}' (convertido de '${name}') não encontrado.` };
        }
    } else {
        error = { code: -32601, message: `Método '${method}' desconhecido.` };
    }

    const response = {
        jsonrpc: '2.0',
        id: id
    };

    if (error) {
        response.error = error;
    } else {
        response.result = result;
    }

    process.stdout.write(JSON.stringify(response) + '\n');
});

