#!/bin/bash
# Gemini CLI Isolado - Usa instalação global existente com ambiente isolado

GEMINI_DIR="/home/user/studio/gemini-local"
GEMINI_CONFIG_DIR="$GEMINI_DIR/.gemini"
GCLOUD_CONFIG_DIR="$GEMINI_DIR/.gcloud"

# Função para configurar ambiente isolado
install_gemini() {
    echo "🔧 Configurando ambiente Gemini isolado..."
    
    # Criar diretórios isolados
    mkdir -p "$GEMINI_CONFIG_DIR"
    mkdir -p "$GCLOUD_CONFIG_DIR"
    
    echo "✅ Ambiente isolado configurado:"
    echo "   Config Gemini: $GEMINI_CONFIG_DIR"
    echo "   Config gcloud: $GCLOUD_CONFIG_DIR"
}

# Função para executar Gemini isolado
run_gemini() {
    echo "🚀 Iniciando Gemini CLI isolado..."
    echo "💡 Para trocar conta: pressione Ctrl+C e execute '$0 auth'"
    echo "🔄 Depois execute novamente este script"
    echo ""
    
    # Configurar variáveis de ambiente isoladas
    export CLOUDSDK_CONFIG="$GCLOUD_CONFIG_DIR"
    export GEMINI_CONFIG_HOME="$GEMINI_CONFIG_DIR"
    
    # Definir diretório de trabalho
    cd "$GEMINI_DIR"
    
    # Usar Gemini CLI isolado com API Key do Google AI Studio
    echo "💡 Para usar mesma API do seu local, configure API Key:"
    echo "1. Vá para: https://aistudio.google.com/app/apikey"
    echo "2. Crie API Key"
    echo "3. Export GEMINI_API_KEY='sua_chave'"
    echo "4. Execute novamente"
    echo ""
    
    # Usar instalação local do Gemini CLI
    /home/user/studio/gemini-local/node_modules/.bin/gemini "$@"
}

# Menu principal
case "${1:-}" in
    "install")
        install_gemini
        ;;
    "auth")
        echo "🔑 Para trocar conta:"
        echo "1. Faça backup das credenciais atuais"
        echo "2. Copie credenciais de outra conta"
        echo ""
        echo "Credencial atual: $GEMINI_CONFIG_DIR/oauth_creds.json"
        echo ""
        echo "Para usar nova conta:"
        echo "  1. Copie arquivo oauth_creds.json de outra instalação"
        echo "  2. Substitua o arquivo em: $GEMINI_CONFIG_DIR/"
        echo "  3. Execute: $0"
        ;;
    "clean")
        echo "🧹 Removendo instalação isolada..."
        rm -rf "$GEMINI_DIR"
        echo "✅ Limpeza concluída"
        ;;
    "help")
        echo "Gemini CLI Isolado"
        echo ""
        echo "Comandos:"
        echo "  $0           - Executar Gemini CLI"
        echo "  $0 install   - Instalar Gemini CLI isolado"
        echo "  $0 auth      - Instruções para trocar conta"
        echo "  $0 clean     - Remover instalação"
        echo "  $0 help      - Esta ajuda"
        ;;
    *)
        # Verificar se ambiente está configurado
        if [ ! -d "$GEMINI_CONFIG_DIR" ]; then
            echo "❌ Ambiente isolado não configurado"
            echo "🔧 Execute: $0 install"
            exit 1
        fi
        
        # Executar Gemini
        run_gemini "$@"
        ;;
esac