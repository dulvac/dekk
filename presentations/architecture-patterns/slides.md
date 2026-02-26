---
title: Architecture Patterns
author: Sammy
---

# Architecture Patterns

Design principles for scalable software systems

---

## Request Flow

```mermaid
flowchart LR
    Client --> Gateway[API Gateway]
    Gateway --> Auth[Auth Service]
    Gateway --> App[App Service]
    App --> DB[(Database)]
    App --> Cache[(Redis Cache)]
```

---

## Layered Architecture

| Layer | Responsibility | Example |
|-------|---------------|---------|
| Presentation | UI rendering | React components |
| Application | Business logic | Use cases, services |
| Domain | Core models | Entities, value objects |
| Infrastructure | External systems | Database, APIs |

**Key rule:** Dependencies point **inward** — infrastructure depends on domain, never the reverse.

---

## Service Communication

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant U as User Service
    participant O as Order Service

    C->>G: POST /orders
    G->>U: Validate token
    U-->>G: User info
    G->>O: Create order
    O-->>G: Order created
    G-->>C: 201 Created
```

---

## Choosing a Pattern

- **Monolith**
  - Start here for most projects
  - Simple deployment and debugging
  - Scale vertically first
- **Microservices**
  - When teams need independent deployment
  - When services have different scaling needs
  - Adds operational complexity
- **Event-Driven**
  - When systems need loose coupling
  - When processing is asynchronous
  - Requires message broker infrastructure

---

## Key Takeaways

1. Start simple — choose the **simplest architecture** that solves the problem
2. Separate concerns with clear **boundaries**
3. Make dependencies explicit and **unidirectional**
4. Design for **change**, not for prediction
