#!/usr/bin/env bash
#
# setup-hooks.sh
# ---------------
# 安裝 git pre-commit hook，用於檢查禁用的 NPM 依賴。
# 可重複執行 — 若 hook 已存在會覆寫為最新版本。
#
# 使用方式：
#   bash scripts/setup-hooks.sh
#   或: bun run setup:hooks

set -euo pipefail

# ---- 顏色 --------------------------------------------------------------
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  RED=$(tput setaf 1)
  CYAN=$(tput setaf 6)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  GREEN=""; YELLOW=""; RED=""; CYAN=""; BOLD=""; RESET=""
fi

# ---- 找到 repo root ---------------------------------------------------
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$REPO_ROOT" ]; then
  echo "${RED}錯誤：不在 git repo 內${RESET}" >&2
  exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
PRE_COMMIT="$HOOKS_DIR/pre-commit"
CHECK_SCRIPT="scripts/check-banned-imports.sh"

# ---- 驗證檢查腳本存在 -------------------------------------------------
if [ ! -f "$REPO_ROOT/$CHECK_SCRIPT" ]; then
  echo "${RED}錯誤：找不到 $CHECK_SCRIPT${RESET}" >&2
  exit 1
fi

# 確保檢查腳本可執行
chmod +x "$REPO_ROOT/$CHECK_SCRIPT"

# ---- 備份現有 hook ----------------------------------------------------
if [ -f "$PRE_COMMIT" ]; then
  # 檢查是否為本腳本安裝的版本（含 marker）
  if grep -q "DRAUPNIR_HOOK_MARKER" "$PRE_COMMIT" 2>/dev/null; then
    echo "${CYAN}偵測到現有 Draupnir hook，將覆寫...${RESET}"
  else
    BACKUP="$PRE_COMMIT.backup.$(date +%Y%m%d%H%M%S)"
    cp "$PRE_COMMIT" "$BACKUP"
    echo "${YELLOW}現有 pre-commit hook 已備份至: $BACKUP${RESET}"
  fi
fi

# ---- 寫入 pre-commit hook ---------------------------------------------
mkdir -p "$HOOKS_DIR"

cat > "$PRE_COMMIT" <<'HOOK_EOF'
#!/usr/bin/env bash
# DRAUPNIR_HOOK_MARKER - 由 scripts/setup-hooks.sh 安裝，請勿手動編輯
#
# 此 hook 執行依賴檢查，防止回退 Bun 原生 API 優化。
# 完整規則：docs/banned-imports.md
# 重新安裝：bun run setup:hooks

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
CHECK_SCRIPT="$REPO_ROOT/scripts/check-banned-imports.sh"

if [ ! -x "$CHECK_SCRIPT" ]; then
  echo "warning: $CHECK_SCRIPT 不存在或不可執行，跳過依賴檢查" >&2
  exit 0
fi

"$CHECK_SCRIPT"
HOOK_EOF

chmod +x "$PRE_COMMIT"

# ---- 成功訊息 ---------------------------------------------------------
echo ""
echo "${BOLD}${GREEN}✓ pre-commit hook 已安裝${RESET}"
echo ""
echo "  ${CYAN}位置:${RESET} .git/hooks/pre-commit"
echo "  ${CYAN}檢查腳本:${RESET} $CHECK_SCRIPT"
echo "  ${CYAN}規則文檔:${RESET} docs/banned-imports.md"
echo ""
echo "  ${BOLD}功能:${RESET}"
echo "    • 阻擋 'uuid' 套件引入"
echo "    • 阻擋 'node:path' 引入（請用 joinPath）"
echo "    • 阻擋 'node:crypto' 引入（白名單除外）"
echo "    • 警告 readFileSync 新增使用"
echo ""
echo "${CYAN}手動測試:${RESET} bash scripts/check-banned-imports.sh"
echo ""
