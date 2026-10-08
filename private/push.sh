#!/bin/bash
# 沿用識人訓練站的推送慣例（SSH over 443，重試 60 次）
cd "$(dirname "$0")/.."
export GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=$PWD/private/ssh_known_hosts -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3"
for i in $(seq 1 60); do
  echo "=== 第 $i 次嘗試 $(date +%H:%M:%S) ==="
  if GIT_TERMINAL_PROMPT=0 git push -u origin main 2>&1; then
    echo "✅ 推送成功（第 $i 次）"; exit 0
  fi
  sleep 3
done
echo "❌ 60 次都失敗"; exit 1
