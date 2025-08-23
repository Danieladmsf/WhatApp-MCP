#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import WhatsApp - usando CommonJS import para evitar erros
import pkg from 'whatsapp-web.js';
import QRCode from 'qrcode';
const { Client, LocalAuth } = pkg;

class WhatsAppMCPReal {
  constructor() {
    this.server = new Server(
      {
        name: 'whatsapp-mcp-real',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.whatsappClient = null;
    this.isReady = false;
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'send_message_real',
          description: 'Enviar mensagem real via WhatsApp autenticado',
          inputSchema: {
            type: 'object',
            properties: {
              phone: {
                type: 'string',
                description: 'Número do telefone (formato: 5511999999999@c.us)',
              },
              message: {
                type: 'string',
                description: 'Mensagem a ser enviada',
              },
            },
            required: ['phone', 'message'],
          },
        },
        {
          name: 'get_contacts_real',
          description: 'Obter contatos reais do WhatsApp autenticado',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Número máximo de contatos (padrão: 20)',
                default: 20,
              },
            },
          },
        },
        {
          name: 'get_chats_real',
          description: 'Obter conversas reais do WhatsApp autenticado',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Número máximo de chats (padrão: 10)',
                default: 10,
              },
            },
          },
        },
        {
          name: 'get_messages_real',
          description: 'Obter mensagens reais de uma conversa',
          inputSchema: {
            type: 'object',
            properties: {
              chat_id: {
                type: 'string',
                description: 'ID do chat para buscar mensagens',
              },
              limit: {
                type: 'number',
                description: 'Número máximo de mensagens (padrão: 10)',
                default: 10,
              },
            },
            required: ['chat_id'],
          },
        },
        {
          name: 'whatsapp_status_real',
          description: 'Verificar status real da conexão WhatsApp',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'send_message_real':
            return await this.sendMessageReal(args.phone, args.message);
          
          case 'get_contacts_real':
            return await this.getContactsReal(args.limit || 20);
          
          case 'get_chats_real':
            return await this.getChatsReal(args.limit || 10);
          
          case 'get_messages_real':
            return await this.getMessagesReal(args.chat_id, args.limit || 10);
          
          case 'whatsapp_status_real':
            return await this.getWhatsAppStatusReal();
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Ferramenta desconhecida: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Erro ao executar ${request.params.name}: ${error.message}`
        );
      }
    });
  }

  async initializeWhatsApp() {
    try {
      console.error('🚀 Conectando ao WhatsApp Web autenticado...');
      
      this.whatsappClient = new Client({
        authStrategy: new LocalAuth({
          dataPath: './whatsapp-session-' + Date.now()
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
        console.error('QR Code recebido. Salvando como imagem...');
        QRCode.toFile('./whatsapp-mcp/qrcode.png', qr, (err) => {
          if (err) {
            console.error('Erro ao salvar a imagem do QR Code:', err);
            return;
          }
          console.error('\n✅ Imagem do QR Code salva em ' + './whatsapp-mcp/qrcode.png');
          console.error('\n!!! ABRA O ARQUIVO qrcode.png E ESCANEIE A IMAGEM COM SEU CELULAR !!!\n');
        });
      });

      this.whatsappClient.on('ready', () => {
        console.error('✅ WhatsApp conectado! Dados reais disponíveis.');
        this.isReady = true;
        console.error('SERVIDOR PRONTO'); // Sinal para o cliente
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
      return {
        content: [
          {
            type: 'text',
            text: '❌ WhatsApp não está conectado. Aguarde a conexão.',
          },
        ],
      };
    }

    try {
      await this.whatsappClient.sendMessage(phone, message);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Mensagem real enviada para ${phone}: ${message}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao enviar mensagem real: ${error.message}`,
          },
        ],
      };
    }
  }

  async getContactsReal(limit = 20) {
    if (!this.isReady) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ WhatsApp não está conectado. Aguarde a conexão.',
          },
        ],
      };
    }

    try {
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

      return {
        content: [
          {
            type: 'text',
            text: `📞 CONTATOS REAIS do seu WhatsApp (${realContacts.length}):\n\n${realContacts
              .map(c => `• ${c.name}\n  📱 ${c.id}\n  ${c.isBlocked ? '🚫 Bloqueado' : '✅ Ativo'}`)
              .join('\n\n')}\n\n💡 Total de contatos encontrados: ${contacts.length}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao obter contatos reais: ${error.message}`,
          },
        ],
      };
    }
  }

  async getChatsReal(limit = 10) {
    if (!this.isReady) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ WhatsApp não está conectado. Aguarde a conexão.',
          },
        ],
      };
    }

    try {
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

      return {
        content: [
          {
            type: 'text',
            text: `💬 CONVERSAS REAIS do seu WhatsApp (${realChats.length}):\n\n${realChats
              .map(c => 
                `${c.isGroup ? '👥' : '👤'} ${c.name}\n` +
                `   💬 ${c.lastMessage}\n` +
                `   ⏰ ${c.timestamp}\n` +
                `   ${c.unreadCount > 0 ? `🔔 ${c.unreadCount} não lidas` : '✅ Lidas'}\n` +
                `   📋 ID: ${c.id}`
              )
              .join('\n\n')}\n\n💡 Total de chats: ${chats.length}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao obter conversas reais: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMessagesReal(chatId, limit = 10) {
    if (!this.isReady) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ WhatsApp não está conectado. Aguarde a conexão.',
          },
        ],
      };
    }

    try {
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

      return {
        content: [
          {
            type: 'text',
            text: `📨 MENSAGENS REAIS de ${chat.name || chatId} (${realMessages.length}):\n\n${realMessages
            .map(msg => 
              `${msg.fromMe ? '📤 Você' : '📥 Contato'}\n` +
              `   💬 ${msg.body}\n` +
              `   ⏰ ${msg.timestamp}\n` +
              `   📋 Tipo: ${msg.type}`
            )
            .join('\n\n')}\n\n💡 Use chat ID das conversas para buscar mensagens específicas`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao obter mensagens reais: ${error.message}`,
          },
        ],
      };
    }
  }

  async getWhatsAppStatusReal() {
    return {
      content: [
        {
          type: 'text',
          text: this.isReady 
            ? '✅ WhatsApp REAL conectado e funcionando\n🔄 Dados reais disponíveis via MCP'
            : '❌ WhatsApp não conectado. Aguardando conexão com sessão autenticada...',
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('🔧 MCP WhatsApp REAL iniciado');
    console.error('📱 Conectando à sua sessão autenticada...');
    
    // Inicializar WhatsApp usando a sessão já autenticada
    this.initializeWhatsApp().catch(error => {
      console.error('❌ Falha crítica ao conectar WhatsApp real:', error);
    });
  }
}

// Iniciar servidor real
const server = new WhatsAppMCPReal();
server.run().catch((error) => {
  console.error('💥 Erro fatal do servidor real:', error);
  process.exit(1);
});