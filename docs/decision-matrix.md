# Decision Matrix

This matrix summarizes how acx aligns with different authorization models and deployment modes. It is intentionally scoped to architecture, not implementation details.

| Engine / Mode | Supported Models | Pros | Cons | When to Use | Typical Deployments |
| --- | --- | --- | --- | --- | --- |
| Embedded engine | RBAC + ABAC + context + task + rules + field-level | Low latency, in-process decisions, full control over policy shape, consistent authoring and testing, no external dependency | Requires app deployment for policy updates, shared consistency across services is your responsibility, no global graph view | You need high performance, policy tied to app release cadence, or regulated environments that forbid external policy services | Monoliths, service mesh with shared library, edge or on-prem apps, regulated SaaS |
| ReBAC adapters (OpenFGA/SpiceDB) | Relationship-based access control with graph semantics | Centralized relationship graph, cross-service reuse, delegated administration, good fit for shared resources | External runtime dependency, requires schema modeling, can add network latency, eventual consistency options | You need global relationship queries across services, fine-grained sharing, or org/tenant hierarchies | Multi-tenant SaaS, collaboration products, B2B platforms, centralized policy service |
| Policy-as-code adapters (OPA/Cedar) | Declarative policies with external evaluation | Portable policies, independent policy release lifecycle, strong auditability, separation from app code | Integration and evaluation overhead, policy tooling and runtime dependency, potential mismatch with app domain types | You need centralized governance, compliance-driven change control, or cross-language enforcement | Enterprise platforms, regulated stacks, multiple services across languages |

Notes:
- V1 ships the embedded engine with local evaluation.
- Adapter modes are planned to align with the same domain model and testing story.
