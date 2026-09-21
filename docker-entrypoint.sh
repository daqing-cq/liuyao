#!/bin/sh
set -e

# 启动校验（§53-3）：生产模式 SESSION_SECRET 缺失或短于 32 位直接拒绝启动
if [ -z "$SESSION_SECRET" ] || [ "${#SESSION_SECRET}" -lt 32 ]; then
  echo "[entrypoint] FATAL: SESSION_SECRET 缺失或短于 32 位，拒绝启动（§53-3）。" >&2
  exit 1
fi

# 确保 /app/data 可写且 config 目录存在（§54-8）
mkdir -p /app/data/config || true

# ai.json 以 0600 创建/修正（§54-8）；启动时校验权限，不符则告警并尝试修正
if [ -f /app/data/config/ai.json ]; then
  PERM=$(stat -c '%a' /app/data/config/ai.json 2>/dev/null || echo "600")
  if [ "$PERM" != "600" ]; then
    echo "[entrypoint] WARN: ai.json 权限为 $PERM，修正为 600（§54-8）" >&2
    chmod 600 /app/data/config/ai.json || true
  fi
fi

umask 0027
exec "$@"
