#!/usr/bin/env bash
#
# check-commit.sh
# ---------------
# 單一提交檢查入口：整合依賴禁用檢查與 i18n locale 契約檢查。
# 供 pre-commit hook 與 CI 共用。

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$REPO_ROOT" ]; then
  echo "error: not inside a git repository" >&2
  exit 1
fi

cd "$REPO_ROOT"

if [ "${CI:-}" = "true" ]; then
  export CHECK_BANNED_IMPORTS_SCOPE=changed
  if [ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] && [ -n "${GITHUB_BASE_REF:-}" ]; then
    git fetch --no-tags --depth=1 origin "$GITHUB_BASE_REF" >/dev/null 2>&1 || true
    export CHECK_BANNED_IMPORTS_BASE="origin/${GITHUB_BASE_REF}"
  elif [ -n "${GITHUB_EVENT_BEFORE:-}" ] && [ "$GITHUB_EVENT_BEFORE" != "0000000000000000000000000000000000000000" ]; then
    if ! git cat-file -e "${GITHUB_EVENT_BEFORE}^{commit}" 2>/dev/null; then
      if [ -n "${GITHUB_REF_NAME:-}" ]; then
        git fetch --no-tags --unshallow origin "$GITHUB_REF_NAME" >/dev/null 2>&1 \
          || git fetch --no-tags --depth=50 origin "$GITHUB_REF_NAME" >/dev/null 2>&1 \
          || true
      fi
    fi
    export CHECK_BANNED_IMPORTS_BASE="$GITHUB_EVENT_BEFORE"
  else
    export CHECK_BANNED_IMPORTS_BASE="$(git rev-parse HEAD~1 2>/dev/null || true)"
  fi
else
  export CHECK_BANNED_IMPORTS_SCOPE=staged
fi

bash scripts/check-banned-imports.sh
bun scripts/check-i18n-locales.ts
