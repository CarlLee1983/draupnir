# Requirements: Draupnir — v1.1 Pages & Framework

**Defined:** 2026-04-11  
**Core Value:** All page handlers have unit tests; all Inertia routes verified; framework capabilities documented.

## v1.1 Requirements (TBD)

Definitions pending after `/gsd:new-milestone` process:

- Research phase to identify page handler testing patterns
- Survey existing framework capabilities and i18n system gaps
- Define requirements for v1.1 milestone scope

## v2 Requirements (Future)

Deferred — see `.planning/milestones/v1.0-REQUIREMENTS.md` for v1 vision.

### Multi-Gateway (from v1)

- **GATE-V2-01**: Implement an `OpenRouterGatewayAdapter` against the now-stable `ILLMGatewayClient`
- **GATE-V2-02**: Implement a `GeminiGatewayAdapter`
- **GATE-V2-03**: Build-time gateway selection factory

### Proxy Abstraction (from v1)

- **PROXY-V2-01**: Extend `ILLMGatewayClient` (or create `ILLMProxyClient`) to cover chat-completion forwarding
- **PROXY-V2-02**: Gateway-agnostic streaming response handling

### SDK Publishing (from v1)

- **SDK-V2-01**: Publish `bifrost-sdk` to a private npm registry

## Out of Scope

(To be defined in requirements phase)

## Traceability

(To be populated after requirements definition)

---
*Requirements for v1.1 to be defined in next `/gsd:new-milestone` phase*
