#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$ROOT/vindicta-ai.desktop"
ICON="$ROOT/assets/vindicta-icon.svg"

if [[ ! -f "$DESKTOP_FILE" ]]; then
  echo "Не найден: $DESKTOP_FILE"
  exit 1
fi

chmod +x "$ROOT/start-vindicta.sh"
chmod +x "$DESKTOP_FILE"

DESKTOP_DIR="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
if [[ -d "$HOME/Рабочий стол" ]]; then
  DESKTOP_DIR="$HOME/Рабочий стол"
fi
mkdir -p "$DESKTOP_DIR" "$HOME/.local/share/applications"

cp "$DESKTOP_FILE" "$DESKTOP_DIR/Vindicta AI.desktop"
cp "$DESKTOP_FILE" "$HOME/.local/share/applications/vindicta-ai.desktop"

chmod +x "$DESKTOP_DIR/Vindicta AI.desktop"
chmod +x "$HOME/.local/share/applications/vindicta-ai.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

if command -v gio >/dev/null 2>&1; then
  gio set "$DESKTOP_DIR/Vindicta AI.desktop" metadata::trusted true 2>/dev/null || true
fi

echo "Готово."
echo "  Рабочий стол: $DESKTOP_DIR/Vindicta AI.desktop"
echo "  Меню приложений: ~/.local/share/applications/vindicta-ai.desktop"
echo "  Иконка: $ICON"
