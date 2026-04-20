---
status: investigating
trigger: "Manager 建立組織後，發送 bifrost 未成功，導至 gateway_team_id 是空的，檢查目前補建機制是否正常"
created: 2026-04-20
updated: 2026-04-20
---

# Symptoms
- **Expected behavior**: Organization should have a valid `gateway_team_id` after creation.
- **Actual behavior**: `gateway_team_id` is null for organization `ea59f7e8-b25c-4dd1-8085-241386f03a0a`.
- **Error messages**: Inferred log `[ProvisionOrganizationDefaults] Failed to ensure Bifrost Team`.
- **Timeline**: Started after recent Bifrost integration changes.
- **Reproduction**: Create organization when Bifrost API is unstable.

# Current Focus
- **hypothesis**: The recovery mechanism (re-running ProvisionOrganizationDefaultsService.execute) is working in theory but lacks a trigger (CLI command or background job) to handle existing failed cases.
- **next_action**: gather initial evidence

# Evidence
- `ea59f7e8-b25c-4dd1-8085-241386f03a0a` has null `gateway_team_id` but active contract and subs.

# Eliminated
