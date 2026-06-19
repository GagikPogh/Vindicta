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
docker compose up -d postgres neo4j redis

log "Ожидание готовности сервисов..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U vindicta >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if docker compose ps backend 2>/dev/null | grep -q "Up"; then
  docker compose up -d backend
else
  log "Запуск backend..."
  docker compose up -d backend 2>/dev/null || {
    log "Backend через Docker недоступен — запустите вручную: cd backend && uvicorn app.main:app --reload"
  }
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
