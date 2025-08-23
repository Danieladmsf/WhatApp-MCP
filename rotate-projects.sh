#!/bin/bash

# Lista de projetos disponíveis
PROJECTS=(
    "gen-lang-client-0610466099"
    "graphic-champion-4d2v9"
    "monospace-5"
)

# Função para obter projeto atual
get_current_project() {
    gcloud config get-value project 2>/dev/null
}

# Função para rotacionar projeto aleatoriamente
rotate_project() {
    current_project=$(get_current_project)
    
    # Remove o projeto atual da lista disponível
    available_projects=()
    for project in "${PROJECTS[@]}"; do
        if [[ "$project" != "$current_project" ]]; then
            available_projects+=("$project")
        fi
    done
    
    # Se não há outros projetos, usa todos
    if [ ${#available_projects[@]} -eq 0 ]; then
        available_projects=("${PROJECTS[@]}")
    fi
    
    # Seleciona projeto aleatório
    random_index=$((RANDOM % ${#available_projects[@]}))
    new_project="${available_projects[$random_index]}"
    
    echo "Rotacionando de '$current_project' para '$new_project'"
    gcloud config set project "$new_project"
    
    # Adiciona delay aleatório entre 1-5 segundos
    sleep $((1 + RANDOM % 5))
}

# Função para executar comando com rotação automática
run_with_rotation() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Tentativa $attempt com projeto $(get_current_project)"
        
        # Executa o comando passado como parâmetro
        eval "$@"
        exit_code=$?
        
        # Se sucesso, sai
        if [ $exit_code -eq 0 ]; then
            return 0
        fi
        
        # Se erro relacionado à quota, rotaciona
        echo "Erro detectado (código $exit_code), rotacionando projeto..."
        rotate_project
        
        ((attempt++))
    done
    
    echo "Falhou após $max_attempts tentativas"
    return 1
}

# Se executado diretamente
if [ "$1" = "--rotate" ]; then
    rotate_project
elif [ "$1" = "--run" ]; then
    shift
    run_with_rotation "$@"
else
    echo "Uso:"
    echo "  $0 --rotate                    # Rotaciona projeto manualmente"
    echo "  $0 --run 'comando'            # Executa comando com rotação automática"
    echo ""
    echo "Projeto atual: $(get_current_project)"
fi