#!/usr/bin/env bash
#
# check-banned-imports.sh
# ------------------------
# 檢查 staged 的 TypeScript/JavaScript 檔案中是否引入已禁用的依賴。
# 此腳本會在 pre-commit 階段執行，阻擋回退 Bun 優化成果。
#
# 禁止清單：
#   - uuid              → 使用 crypto.randomUUID()
#   - node:path         → 使用 src/Pages/page-routes.ts 中的 joinPath()/normalizePath()
#   - node:crypto       → 使用 crypto.subtle / crypto.getRandomValues()
#                         （白名單：PasswordHasher.ts, WebhookSecret.ts）
#
# 警告（不阻擋）：
#   - readFileSync 新增使用 — 可能影響啟動性能
#
# 參閱 docs/banned-imports.md 了解完整規則與替代方案。

set -euo pipefail

# ---- 顏色 ---------------------------------------------------------------
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  RED=$(tput setaf 1)
  YELLOW=$(tput setaf 3)
  GREEN=$(tput setaf 2)
  CYAN=$(tput setaf 6)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  RED=""; YELLOW=""; GREEN=""; CYAN=""; BOLD=""; RESET=""
fi

# ---- 白名單（允許 node:crypto 的檔案） -------------------------------
# 使用相對於 repo root 的路徑。
CRYPTO_ALLOWLIST=(
  "src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts"
  "src/Modules/DevPortal/Domain/ValueObjects/WebhookSecret.ts"
)

is_crypto_allowlisted() {
  local file="$1"
  for allowed in "${CRYPTO_ALLOWLIST[@]}"; do
    if [ "$file" = "$allowed" ]; then
      return 0
    fi
  done
  return 1
}

# ---- 取得 staged 檔案（只處理新增的行） ------------------------------
# --diff-filter=ACMR: Added / Copied / Modified / Renamed
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

ERRORS=0
WARNINGS=0
ERROR_LOG=""
WARN_LOG=""

append_error() {
  ERRORS=$((ERRORS + 1))
  ERROR_LOG="${ERROR_LOG}$1"$'\n'
}

append_warn() {
  WARNINGS=$((WARNINGS + 1))
  WARN_LOG="${WARN_LOG}$1"$'\n'
}

# ---- 檢查單一檔案 -----------------------------------------------------
check_file() {
  local file="$1"

  # 只檢查「新增的行」（git diff 輸出以 + 開頭，但排除 +++ header）
  # --unified=0 讓 context 為 0，避免誤報現存程式碼
  local added_lines
  added_lines=$(git diff --cached --unified=0 -- "$file" 2>/dev/null | grep -E '^\+[^+]' || true)

  if [ -z "$added_lines" ]; then
    return
  fi

  # 1) uuid
  if printf '%s\n' "$added_lines" | grep -qE "from[[:space:]]+['\"]uuid['\"]"; then
    append_error "${RED}✘${RESET} ${BOLD}${file}${RESET}: 引入 ${RED}'uuid'${RESET}
    ${CYAN}→${RESET} 替代方案: 使用 ${GREEN}crypto.randomUUID()${RESET}（Bun 原生 API）"
  fi

  # 2) node:path
  if printf '%s\n' "$added_lines" | grep -qE "from[[:space:]]+['\"]node:path['\"]"; then
    append_error "${RED}✘${RESET} ${BOLD}${file}${RESET}: 引入 ${RED}'node:path'${RESET}
    ${CYAN}→${RESET} 替代方案: 使用 ${GREEN}joinPath()${RESET} / ${GREEN}normalizePath()${RESET}
    ${CYAN}  位置:${RESET} src/Pages/page-routes.ts"
  fi

  # 3) node:crypto（檢查白名單）
  if printf '%s\n' "$added_lines" | grep -qE "from[[:space:]]+['\"]node:crypto['\"]"; then
    if ! is_crypto_allowlisted "$file"; then
      append_error "${RED}✘${RESET} ${BOLD}${file}${RESET}: 引入 ${RED}'node:crypto'${RESET}
    ${CYAN}→${RESET} 替代方案: 使用 ${GREEN}crypto.subtle${RESET} / ${GREEN}crypto.getRandomValues()${RESET}（Web Crypto API）
    ${CYAN}  白名單:${RESET} 僅允許 PasswordHasher.ts, WebhookSecret.ts"
    fi
  fi

  # 4) readFileSync 警告（不阻擋）
  if printf '%s\n' "$added_lines" | grep -qE "\breadFileSync\b"; then
    append_warn "${YELLOW}⚠${RESET} ${BOLD}${file}${RESET}: 新增 ${YELLOW}readFileSync${RESET} 使用
    ${CYAN}→${RESET} 考慮使用 ${GREEN}Bun.file().text()${RESET}（async）以避免阻塞"
  fi
}

# ---- 逐檔檢查 ---------------------------------------------------------
while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue
  check_file "$file"
done <<< "$STAGED_FILES"

# ---- 報告結果 ---------------------------------------------------------
if [ $ERRORS -gt 0 ] || [ $WARNINGS -gt 0 ]; then
  echo ""
  echo "${BOLD}${CYAN}─── 依賴檢查 ───────────────────────────────────────${RESET}"
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "${BOLD}${RED}禁用依賴（${ERRORS} 項）：${RESET}"
  echo ""
  printf '%s' "$ERROR_LOG"
fi

if [ $WARNINGS -gt 0 ]; then
  echo ""
  echo "${BOLD}${YELLOW}警告（${WARNINGS} 項）：${RESET}"
  echo ""
  printf '%s' "$WARN_LOG"
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "${BOLD}${CYAN}完整規則與替代方案:${RESET} docs/banned-imports.md"
  echo "${BOLD}${CYAN}背景:${RESET} Bun 依賴優化項目 (docs/DEPENDENCY_OPTIMIZATION_REPORT.md)"
  echo ""
  echo "${BOLD}${RED}Commit 已被阻擋。${RESET}"
  echo ""
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo ""
  echo "${CYAN}（警告不阻擋 commit）${RESET}"
  echo ""
fi

exit 0
