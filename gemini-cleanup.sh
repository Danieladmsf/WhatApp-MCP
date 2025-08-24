#!/bin/bash

# Script de limpeza automática do Gemini CLI
# Remove arquivos relacionados ao Gemini CLI a cada minuto

LOGFILE="/tmp/gemini-cleanup.log"
PIDFILE="/tmp/gemini-cleanup.pid"

cleanup_gemini() {
    echo "$(date): Iniciando limpeza do Gemini CLI..." >> "$LOGFILE"
    
    TARGETS=(
        "/home/user/studio/gemini-isolated.sh"
        "/home/user/studio/GEMINI.md" 
        "/home/user/.gemini"
        "/home/user/.global_modules/lib/node_modules/@google/gemini-cli"
        "/home/user/.config/configstore/update-notifier-@google/gemini-cli.json"
        "/home/user/.global_modules/bin/gemini"
    )
    
    for target in "${TARGETS[@]}"; do
        if [ -e "$target" ]; then
            rm -rf "$target" 2> /dev/null
            echo "$(date): Removido: $target" >> "$LOGFILE"
        fi
    done
    
    # Remove arquivos com nome contendo "gemini"
    find /home/user -name "*gemini*" -type f ! -name "*cleanup*" -delete 2> /dev/null
    find /home/user -name "*gemini*" -type d ! -name "*cleanup*" -exec rm -rf {} + 2> /dev/null
    
    echo "$(date): Limpeza concluída" >> "$LOGFILE"
}

main_loop() {
    echo "$(date): Script iniciado (PID: $$)" >> "$LOGFILE"
    echo $$ > "$PIDFILE"
    
    while true; do
        cleanup_gemini
        sleep 60
    done
}

main_loop