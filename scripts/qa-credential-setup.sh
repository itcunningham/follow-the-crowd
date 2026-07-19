#!/usr/bin/env bash
# Interactive one-time setup for .env.qa.local — run in a foreground terminal only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.qa.local"
STATUS_FILE="$ROOT/.qa-setup-status"

cd "$ROOT"
umask 077
: >"$STATUS_FILE"
chmod 600 "$STATUS_FILE" 2>/dev/null || true

if [ ! -t 0 ]; then
  echo "This script must run in an interactive terminal (stdin is not a TTY)."
  echo "Run: bash scripts/qa-credential-setup.sh"
  echo "pending" >"$STATUS_FILE"
  exit 1
fi

echo "=============================================="
echo " FTC QA — secure credential setup"
echo " Synthetic QA-only accounts. Do not commit."
echo " Passwords are hidden while typing."
echo "=============================================="
echo ""

read -r -p "Planner email: " PLANNER_EMAIL </dev/tty
read -r -s -p "Planner password: " PLANNER_PASSWORD </dev/tty
echo ""
read -r -p "DJ email: " DJ_EMAIL </dev/tty
read -r -s -p "DJ password: " DJ_PASSWORD </dev/tty
echo ""
read -r -p "Both-role email: " BOTH_EMAIL </dev/tty
read -r -s -p "Both-role password: " BOTH_PASSWORD </dev/tty
echo ""

{
  echo "# Synthetic QA credentials — do not commit"
  printf 'FTC_QA_PLANNER_EMAIL=%s\n' "$PLANNER_EMAIL"
  printf 'FTC_QA_PLANNER_PASSWORD=%s\n' "$PLANNER_PASSWORD"
  printf 'FTC_QA_DJ_EMAIL=%s\n' "$DJ_EMAIL"
  printf 'FTC_QA_DJ_PASSWORD=%s\n' "$DJ_PASSWORD"
  printf 'FTC_QA_BOTH_EMAIL=%s\n' "$BOTH_EMAIL"
  printf 'FTC_QA_BOTH_PASSWORD=%s\n' "$BOTH_PASSWORD"
} >"$ENV_FILE"

chmod 600 "$ENV_FILE"
unset PLANNER_EMAIL PLANNER_PASSWORD DJ_EMAIL DJ_PASSWORD BOTH_EMAIL BOTH_PASSWORD

missing=()
for key in FTC_QA_PLANNER_EMAIL FTC_QA_PLANNER_PASSWORD FTC_QA_DJ_EMAIL FTC_QA_DJ_PASSWORD FTC_QA_BOTH_EMAIL FTC_QA_BOTH_PASSWORD; do
  line=$(grep "^${key}=" "$ENV_FILE" || true)
  val="${line#*=}"
  if [ -z "$val" ]; then
    missing+=("$key")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Setup incomplete. Missing: ${missing[*]}"
  echo "incomplete" >"$STATUS_FILE"
  exit 1
fi

perms=$(stat -f %Lp "$ENV_FILE" 2>/dev/null || stat -c %a "$ENV_FILE")
ignored=$(git check-ignore -q "$ENV_FILE" && echo yes || echo no)

echo ""
echo "Setup complete."
echo "  File exists: yes"
echo "  Permissions: $perms"
echo "  Git ignored: $ignored"
echo "  All six variables populated: yes"
echo "complete" >"$STATUS_FILE"
