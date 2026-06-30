# Architectural & Implementation Decisions

> This file is updated by the AI when instructed. Every significant decision is recorded with context, rationale, and alternatives considered.

---

## Decision Log

| ID | Date | Decision | Rationale | Status |
|----|------|----------|-----------|--------|
| ADR-001 | 2026-06-30 | Local Native Database and Cache Services (No Docker) | Docker daemon is not running on the system; native services are preferred. | Accepted |

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
