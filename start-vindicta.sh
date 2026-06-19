#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { echo "[Vindicta] $*"; }

if ! command -v docker >/dev/null 2>&1; then
  log "Docker не найден. Установите Docker и повторите."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  log "npm не найден. Установите Node.js и повторите."
  exit 1
fi

if [[ ! -f .env ]]; then
  log "Создаю .env из .env.example..."
  cp .env.example .env
fi

log "Запуск PostgreSQL, Neo4j, Redis, Backend..."
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  log "Docker Compose не найден — пропускаю backend-сервисы."
  log "Установите docker-compose или запустите backend вручную."
  COMPOSE=""
fi

if [[ -n "$COMPOSE" ]]; then
  $COMPOSE up -d postgres neo4j redis backend 2>/dev/null || $COMPOSE up -d 2>/dev/null || log "Docker compose failed — continuing with frontend only."
fi

log "Запуск frontend на http://localhost:3000 ..."
cd "$ROOT/frontend"

if [[ ! -d node_modules ]]; then
  log "Установка зависимостей frontend..."
  npm install
fi

sleep 2
xdg-open "http://localhost:3000" >/dev/null 2>&1 &

exec npm run dev
