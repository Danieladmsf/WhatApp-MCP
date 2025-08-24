# Servidor de API do WhatsApp

Este projeto fornece uma API HTTP RESTful para interagir com o WhatsApp. Ele funciona como uma ponte, traduzindo chamadas de API para comandos que controlam uma sessão do WhatsApp Web em segundo plano.

## Arquitetura

- **`api-server.js`**: O ponto de entrada principal. É um servidor [Express.js](https://expressjs.com/) que expõe a API RESTful.
- **`server-real.js`**: O processo núcleo que gerencia a comunicação com a biblioteca `whatsapp-web.js`. Ele é iniciado e gerenciado automaticamente pelo `api-server.js`.

## Instalação e Inicialização

Abra um terminal, navegue até este diretório e execute:

```bash
# 1. Instalar dependências (apenas na primeira vez)
npm install

# 2. Iniciar o servidor da API
npm start
```

O servidor estará rodando em `http://localhost:3001`.

Na primeira inicialização, pode ser necessário escanear um QR Code que aparecerá no terminal para autenticar sua sessão do WhatsApp.

Para encerrar o servidor de forma limpa, utilize `Ctrl+C` no terminal. Isso garantirá que a sessão do WhatsApp seja desconectada corretamente.

## Endpoints da API

A base da URL para todas as chamadas é `http://localhost:3001`.

### `GET /status`

Verifica a saúde do servidor da API e do processo de conexão com o WhatsApp.

**Exemplo de Requisição:**
```bash
cURL http://localhost:3001/status
```

**Resposta de Sucesso:**
```json
{
  "status": "ok",
  "message": "API server is running and MCP process is alive."
}
```

**Resposta de Erro (Exemplo - Processo MCP encerrado):**
```json
{
  "status": "error",
  "message": "MCP process has terminated with code [código]. Please check logs or restart the server."
}
```

---


### `GET /contacts`

Retorna a lista completa de contatos do WhatsApp.

**Exemplo de Requisição:**
```bash
cURL http://localhost:3001/contacts
```

**Resposta de Sucesso (Exemplo):**
```json
[
    {
        "id": "5511999999999@c.us",
        "name": "Nome do Contato",
        "number": "5511999999999",
        "isBlocked": false
    }
]
```

---


### `GET /messages/:chatId`

Retorna as mensagens de uma conversa específica. O ID do chat (`chatId`) geralmente é o número do contato no formato `NUMERO@c.us`.

**Parâmetros da Query:**
- `limit` (opcional): Número de mensagens para retornar. O padrão é 20.

**Exemplo de Requisição (para as últimas 5 mensagens):**
```bash
cURL "http://localhost:3001/messages/5511999999999@c.us?limit=5"
```

**Resposta de Sucesso (Exemplo):**
```json
[
    {
        "id": "true_5511999999999@c.us_3EB0...",
        "body": "Olá, esta é a última mensagem",
        "fromMe": true,
        "timestamp": 1678886400
    }
]
```

---


### `POST /send`

Envia uma nova mensagem de texto.

**Corpo da Requisição (JSON):**
```json
{
  "phone": "5511999999999@c.us",
  "message": "Olá do servidor da API!"
}
```

**Exemplo de Requisição:**
```bash
curl -X POST -H "Content-Type: application/json" \
     -d '{"phone":"5511999999999@c.us","message":"Olá do servidor da API!"}' \
     http://localhost:3001/send
```

**Resposta de Sucesso:**
Retorna o objeto da mensagem enviada, confirmando o envio.

```json