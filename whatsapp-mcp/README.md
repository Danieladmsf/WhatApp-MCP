# Servidor MCP para Integração com WhatsApp

Este projeto fornece um servidor Model Context Protocol (MCP) para integrar funcionalidades do WhatsApp com sistemas de IA ou outras aplicações. Ele permite enviar mensagens, obter contatos, chats e mensagens, e verificar o status da conexão do WhatsApp.

## Funcionalidades

*   **`send_message_real`**: Envia mensagens de texto para contatos ou grupos.
*   **`get_contacts_real`**: Obtém a lista de contatos do WhatsApp.
*   **`get_chats_real`**: Obtém a lista de conversas (chats) do WhatsApp.
*   **`get_messages_real`**: Obtém mensagens de uma conversa específica.
*   **`whatsapp_status_real`**: Verifica o status da conexão do WhatsApp.

## Como Iniciar (Para o Usuário)

Siga estes passos para colocar o servidor em funcionamento:

### 1. Pré-requisitos

Certifique-se de ter o [Node.js](https://nodejs.org/) (versão 18 ou superior) e o `npm` (gerenciador de pacotes do Node.js) instalados em seu sistema.

### 2. Instalação das Dependências

Navegue até o diretório `whatsapp-mcp` e instale as dependências do projeto:

```bash
cd /home/user/studio/whatsapp-mcp
npm install
```

### 3. Iniciando o Servidor

O projeto utiliza um servidor de API de teste (`api-test-client.js`) que gerencia o servidor principal do WhatsApp (`server-real.js`). Este é o único script que você precisa iniciar.

Abra um **único terminal** e execute:

```bash
node /home/user/studio/whatsapp-mcp/api-test-client.js
```

Deixe este terminal aberto e rodando.

### 4. Autenticação do WhatsApp (Primeira Vez ou Sessão Expirada)

Na primeira vez que você iniciar o servidor, ou se sua sessão do WhatsApp expirar, você precisará autenticar:

*   O terminal exibirá a mensagem: `✅ Imagem do QR Code salva em ./whatsapp-mcp/qrcode.png`.
*   **Abra o arquivo `qrcode.png`** localizado no diretório `whatsapp-mcp` (por exemplo, `/home/user/studio/whatsapp-mcp/qrcode.png`) usando um visualizador de imagens.
*   **Escaneie o QR Code** exibido na imagem com o aplicativo do WhatsApp no seu celular (Vá em `Configurações` > `Aparelhos Conectados` > `Conectar um aparelho`).
*   Após escanear, o terminal exibirá `✅ Conexão com WhatsApp estabelecida e pronta para uso!`.

## Como uma IA (ou Cliente) Pode se Conectar

Uma vez que o servidor esteja rodando e conectado ao WhatsApp (conforme o passo 4 acima), qualquer sistema de IA ou cliente pode interagir com ele através de uma API HTTP simples.

### Base URL

Todas as requisições devem ser feitas para: `http://localhost:3001`

### Endpoints da API

#### 1. Verificar Status da Conexão

*   **Endpoint:** `/status`
*   **Método:** `GET`
*   **Descrição:** Verifica se o servidor está conectado ao WhatsApp e pronto para receber comandos.
*   **Exemplo de Requisição (cURL):**
    ```bash
    curl http://localhost:3001/status
    ```
*   **Exemplo de Resposta (Sucesso):**
    ```json
    {
      "status": "pronto",
      "message": "Conectado ao WhatsApp."
    }
    ```
*   **Exemplo de Resposta (Servidor não pronto):**
    ```json
    {
      "status": "ocupado",
      "message": "Aguardando conexão com o WhatsApp. Tente novamente em alguns segundos."
    }
    ```

#### 2. Obter Contatos

*   **Endpoint:** `/contatos`
*   **Método:** `GET`
*   **Descrição:** Retorna uma lista dos contatos do WhatsApp.
*   **Exemplo de Requisição (cURL):**
    ```bash
    curl http://localhost:3001/contatos
    ```
*   **Exemplo de Resposta (Sucesso):**
    ```json
    [
      {
        "type": "text",
        "text": "📞 CONTATOS REAIS do seu WhatsApp (20):\n\n• Nome do Contato 1\n  📱 5511999999999@c.us\n  ✅ Ativo\n\n..."
      }
    ]
    ```
    *   A resposta é um array de objetos de conteúdo. O texto com os contatos estará dentro de `content[0].text`.

#### 3. Enviar Mensagem

*   **Endpoint:** `/enviar`
*   **Método:** `POST`
*   **Descrição:** Envia uma mensagem de texto para um contato ou grupo.
*   **Corpo da Requisição (JSON):**
    ```json
    {
      "phone": "NUMERO_DO_CONTATO@c.us",
      "message": "SUA MENSAGEM"
    }
    ```
    *   `phone`: O número de telefone do destinatário no formato `DDDNUMERO@c.us` (para contatos) ou `ID_DO_GRUPO@g.us` (para grupos).
    *   `message`: O texto da mensagem a ser enviada.
*   **Exemplo de Requisição (cURL):**
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"phone":"5511999999999@c.us","message":"Olá, este é um teste!"}' http://localhost:3001/enviar
    ```
*   **Exemplo de Resposta (Sucesso):**
    ```json
    [
      {
        "type": "text",
        "text": "✅ Mensagem real enviada para 5511999999999@c.us: Olá, este é um teste!"
      }
    ]
    ```
*   **Exemplo de Resposta (Erro):**
    ```json
    {
      "error": "Erro ao enviar mensagem real: [Detalhes do Erro]"
    }
    ```

## Observações Importantes

*   **Sessão do WhatsApp:** O servidor mantém uma sessão persistente na pasta `whatsapp-session`. Se esta pasta for excluída ou a sessão for invalidada (ex: conectar o WhatsApp em outro lugar), um novo QR Code será gerado na próxima inicialização.
*   **Chromium Headless:** O `whatsapp-web.js` utiliza o Chromium em modo headless. Certifique-se de que seu ambiente tenha os recursos necessários para executá-lo.
*   **Logs:** O terminal onde o `api-test-client.js` está rodando exibirá logs detalhados do servidor MCP e do WhatsApp, úteis para depuração.
