# Architectural & Implementation Decisions

> This file is updated by the AI when instructed. Every significant decision is recorded with context, rationale, and alternatives considered.

---

## Decision Log

| ID | Date | Decision | Rationale | Status |
|----|------|----------|-----------|--------|
| ADR-001 | 2026-06-30 | Local Native Database and Cache Services (No Docker) | Docker daemon is not running on the system; native services are preferred. | Accepted |
| ADR-002 | 2026-07-02 | Global Tenant-Isolated Mongoose Audit Logging & Context Wrapping | Mongoose post-save hooks trigger on subdocs, and tenant-isolation plugin requires context. Wrap logs in runWithTenant. | Accepted |

---

## Architectural Decision Records (ADRs)

### ADR-001: Local Native Database and Cache Services (No Docker)

**Date**: 2026-06-30  
**Status**: Accepted  
**Decider**: Super Agent / Backend Agent  
**Phase**: PHASE-01

#### Context

We need MongoDB and Redis instances for local development and testing. Running them inside Docker containerization was originally proposed, but running script execution and Docker daemons is restricted/unavailable on the local host machine.

#### Decision

We will run MongoDB and Redis as native Windows/local services. 
- MONGODB_URI: `mongodb://127.0.0.1:27017/expenseflow` (default local port)
- REDIS_URL: `redis://127.0.0.1:6379` (default local port)

#### Alternatives Considered

1. **Docker / Docker Compose**: Standard containerization — rejected because the Docker daemon is not active on this developer machine.
2. **Mock In-Memory Databases**: Using in-memory mongo/redis — rejected for Phase 1 as native services are available and provide real integration testing.

#### Consequences

- **Positive**: Lightweight setup, no Docker overhead, faster startup time for services.
- **Negative**: Port conflicts if another app uses 27017 or 6379; requires manual setup of local services if they are not already installed.
- **Neutral**: The application code remains identical; only environmental configuration (`.env`) is altered.

---

### ADR-002: Global Tenant-Isolated Mongoose Audit Logging & Context Wrapping

**Date**: 2026-07-02  
**Status**: Accepted  
**Decider**: Antigravity  
**Phase**: PHASE-08

#### Context

To support Phase 8 compliance audit logging, we implemented a global mongoose plugin (`auditLogPlugin`) that hooks into `save` and `findOneAndUpdate` to record document changes. However:
1. Mongoose triggers `save` post-hooks on embedded subdocuments (subdocs), which don't have separate collections, causing `TypeError: doc.constructor.model` crashes.
2. The global `tenantIsolationPlugin` requires an active tenant context (`getTenantId()`) to validate and save documents, including the `AuditLog` itself. Since manual logging of actions like `SIGNUP` or `LOGIN` occurs outside the request context (before interceptors run), database creates fail validation.

#### Decision

1. **Subdoc Detection**: Ignore subdocuments in mongoose hooks by checking `doc.$isEmbedded || !doc.constructor || !doc.constructor.modelName`.
2. **Auto-Wrapping Context**: Wrap all database creations inside `AuditLogsService.log` within `runWithTenant(tenantId, async () => { ... })` to satisfy the tenant isolation checks.
3. **E2E Test Wrappers**: Wrap direct database creations in integration tests' `beforeAll` blocks in `runWithTenant` to bypass `Tenant context is required` exceptions.

#### Alternatives Considered

1. **Disabling Tenant Isolation for Audit Logs**: Rejected because audit logs contain sensitive tenant information and must be strictly isolated.
2. **Manual runWithTenant wrapping in Controller/Services**: Rejected as it is error-prone. Centralizing the context wrapping inside `AuditLogsService.log` ensures all callers get context validation automatically.

#### Consequences

- **Positive**: Robust, error-free audit trails; zero leaks of audit records across tenants; simplified services and test files.
- **Negative**: Adds minor execution overhead from `Promise` wrapping in `AuditLogsService.log`.
- **Neutral**: Context is correctly bound to `AsyncLocalStorage` during lifecycle hooks.
