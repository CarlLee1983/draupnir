---
status: verifying
trigger: "http://localhost:3000/manager/organization 頁面按儲存出現 CSRF token mismatch 錯誤，Inertia 收到 JSON 回應而非 Inertia 回應"
created: 2026-04-16
updated: 2026-04-16
---

## Symptoms

- **URL**: http://localhost:3000/manager/organization
- **Action**: 點擊儲存按鈕
- **Expected**: 表單成功儲存，Inertia 回應
- **Actual**: 錯誤訊息 "All Inertia requests must receive a valid Inertia response, however a plain JSON response was received."
- **Error response**: `{"success":false,"message":"CSRF token mismatch or missing","error":"CSRF_MISMATCH"}`
- **Timeline**: 不確定是否最近才出現
- **Scope**: 未測試其他頁面，可能只影響 Organization 頁面

## Current Focus

- hypothesis: "CSRF 驗證失敗時 attachWebCsrf 回傳純 JSON 419，Inertia client 不認識此回應格式，顯示 dialog 錯誤"
- test: "新增 isInertiaRequest 偵測，對 Inertia PUT 請求回傳 302 + X-Inertia-Location 讓 client 重載頁面"
- expecting: "CSRF 失敗後 Inertia 重載頁面拿到新 token，下次提交成功"
- next_action: "等待 human verification"

## Evidence

- timestamp: 2026-04-16
  checked: CsrfMiddleware.ts — attachWebCsrf()
  found: 當 UNSAFE_METHOD (PUT/POST/PATCH/DELETE) CSRF 驗證失敗時，直接回傳 ctx.json({...}, 419)，無 X-Inertia header
  implication: Inertia XHR 收到非 Inertia 回應，觸發 dialog_default.show() 顯示原始 JSON 內容

- timestamp: 2026-04-16
  checked: @inertiajs/core@3.0.3/dist/index.js — handleNonInertiaResponse()
  found: |
    async handleNonInertiaResponse() {
      if (this.isInertiaRedirect()) { ... }
      if (this.isLocationVisit()) { ... }
      // fallthrough: shows dialog
      if (fireHttpExceptionEvent(response)) {
        return dialog_default.show(response.data);
      }
    }
    dialog_default.createIframeAndPage():
      if (typeof html === "object") {
        html = `All Inertia requests must receive a valid Inertia response, however a plain JSON response was received.<hr>${JSON.stringify(html)}`
      }
  implication: 收到 419 JSON 時會顯示含 CSRF_MISMATCH 內容的 dialog，與使用者看到的錯誤完全吻合

- timestamp: 2026-04-16
  checked: HttpKernel.ts — middleware chain, CsrfMiddleware validation logic, fromGravitoContext setCookie/getCookie
  found: CSRF double-submit 邏輯本身正確；cookie 編解碼對稱；pendingCookiesMiddleware 正確包裝 handler
  implication: CSRF 驗證機制無 code bug；失敗原因是 cookie 缺失（過期、首次訪問、瀏覽器清除等）

- timestamp: 2026-04-16
  checked: 全部 1143 tests
  found: 0 failures；CSRF middleware、Organization page、manager middleware 均 100% pass
  implication: 問題為 runtime 情境問題，不是邏輯 bug

- timestamp: 2026-04-16
  checked: Inertia XHR getCookie 實作
  found: getCookie = decodeURIComponent(match[3])；與 server readCookieCsrf decodeCookieValue 對稱，值相符
  implication: 正常情況下 cookie 存在時 CSRF 一定 pass；失敗只因 cookie 缺失

## Eliminated

- hypothesis: "CSRF 驗證邏輯本身有 bug（編解碼不對稱）"
  evidence: base64url token 字元集不含需 URL encode 的字元，encodeURIComponent 是 no-op；雙端解碼對稱
  timestamp: 2026-04-16

- hypothesis: "middleware 鏈順序錯誤導致 pendingCookiesMiddleware 不執行"
  evidence: 正常 manager GET 時 requireManager passes → pendingCookies wraps handler → cookie 確實被 set
  timestamp: 2026-04-16

- hypothesis: "Gravito PUT route 未被正確 handle"
  evidence: core.router.put() 存在；Gravito 3.0.1 支援 put；route 回傳 Response 直接 serve
  timestamp: 2026-04-16

- hypothesis: "服務注入失敗（GetUserMembershipService 未 register）"
  evidence: OrganizationServiceProvider 已正確 bind 'getUserMembershipService'；所有 tests pass
  timestamp: 2026-04-16

## Resolution

root_cause: |
  attachWebCsrf() 在 CSRF 驗證失敗時對所有請求回傳純 JSON 419 response（無 X-Inertia header）。
  Inertia XHR client 收到非 Inertia response 後呼叫 handleNonInertiaResponse()，最終觸發
  dialog_default.show() 顯示 "All Inertia requests must receive a valid Inertia response, however
  a plain JSON response was received." 並附上 CSRF_MISMATCH JSON 內容。
  CSRF 失敗的觸發條件：XSRF-TOKEN cookie 缺失（過期 12h、首次訪問、瀏覽器清除 cookie 等）。

fix: |
  在 attachWebCsrf() 中偵測 Inertia 請求（X-Inertia: true header）。
  CSRF 失敗 + Inertia 請求時，回傳 302 + Location + X-Inertia-Location 指向目前頁面。
  Inertia client 的 handleNonInertiaResponse() 偵測到 X-Inertia-Location header，
  執行 locationVisit() 強制全頁重載，使用者拿到新的 XSRF-TOKEN cookie，再次提交即成功。
  非 Inertia 請求維持原本 419 JSON 回應不變。

verification: |
  - 新增 2 個測試：PUT + X-Inertia header CSRF 失敗 → 302 + X-Inertia-Location；
    POST (no Inertia) CSRF 失敗 → 419 JSON（原有行為不變）
  - 全套 1145 tests pass，0 fail
  - CsrfMiddleware.ts coverage: 97.44%

files_changed:
  - src/Website/Http/Security/CsrfMiddleware.ts
  - src/Website/__tests__/Http/Security/CsrfMiddleware.test.ts
