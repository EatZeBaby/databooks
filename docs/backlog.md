## DataMesh Social — Engineering Backlog (MVP → Phase 2)

### Principles
- Build a thin, secure MVP quickly; optimize for learning and iteration.
- Prefer advice/snippets over managed data movement in MVP.
- Keep auth, audit, and visibility controls first-class from day one.

---

## Epics

### Epic A — Foundations (Auth, Users/Orgs, Datasets, Search, Feed skeleton)
Goal: Provide secure authentication, core entities, dataset CRUD, basic search, and a minimal feed.

User stories:
1. As a user, I can log in using my organization SSO (OIDC/OAuth2) so that I can access the app.
   - Acceptance: OIDC login flow completes, JWT issued, refresh handled, logout works.
2. As an admin, I can create and manage organizations so that users can be scoped per org.
   - Acceptance: CRUD for organizations; users linked to orgs; org-scoped access.
3. As a producer, I can publish a dataset profile with required fields so consumers can discover it.
   - Acceptance: POST /datasets with validation and audit log; GET /datasets/{id} returns the created profile.
4. As a producer, I can update dataset metadata so the catalog stays current.
   - Acceptance: PATCH /datasets/{id}; audit log entry created.
5. As a consumer, I can search datasets by text and filters so I can find relevant data.
   - Acceptance: GET /datasets?query=... supports text and filter params; returns paginated results.
6. As a user, I can view a basic feed of recent events so I can see activity.
   - Acceptance: GET /feed returns recent normalized events; pagination by time/id.

Done when:
- OIDC login operational; Users, Orgs, Datasets CRUD in Postgres; Search via Postgres full-text; Feed table exists; Basic audit logs.

---

### Epic B — Connect Experience (Platform profiles, templating, Connect endpoint)
Goal: Provide one-click render of platform-specific connection artifacts using templates.

User stories:
1. As a user, I can set my platform profile so snippets are tailored to my environment.
   - Acceptance: PATCH/POST platform profile; secret refs stored, not raw secrets.
2. As a consumer, I can click Connect on a dataset to get a platform-specific code snippet.
   - Acceptance: POST /datasets/{id}/connect returns rendered snippet based on dataset + platform profile.
3. As a user, I can copy the artifact with one click, and optionally test a connection (where safe).
   - Acceptance: Connect response includes artifacts and a connection_test result flag when policy allows.
4. As a system, I emit an event when a connect action happens so activity shows in the feed.
   - Acceptance: dataset.connected event created with actor, dataset, platform.

Done when:
- Templates exist for Snowflake, Databricks, BigQuery, Redshift; Rendering service; Connect endpoint implemented; Events and audit logged.

---

### Epic C — Governance & Visibility (MVP)
Goal: Control dataset visibility and audit key actions.

User stories:
1. As an owner, I can set dataset visibility to public/internal/private.
   - Acceptance: Visibility validated at API; enforced in search and GET endpoints.
2. As a governance officer, I can view audit logs for sensitive actions.
   - Acceptance: Audit entries for publish, edit, connect, refresh with actor and timestamp.

Done when:
- Visibility enforced end-to-end; audit logs searchable (basic).

---

### Epic D — Feed & Real-time
Goal: Real-time activity via SSE/WS; minimal ranking by recency and follows.

User stories:
1. As a user, I can subscribe to a live feed stream for my org.
   - Acceptance: SSE endpoint streams events within defined latency SLA.
2. As a user, I can follow a dataset to personalize my feed.
   - Acceptance: POST /follows toggles follow; feed returns followed dataset events prioritized.

Done when:
- SSE endpoint operational; events normalized; basic personalization by follows and org.

---

### Epic E — Connectors Catalog (Metadata + test connection)
Goal: Catalog connector types and allow safe connection tests with secret references.

User stories:
1. As an admin, I can list available connectors and their capabilities.
   - Acceptance: GET /connectors returns catalog; includes capability flags and config schema refs.
2. As an admin, I can test a connector configuration safely.
   - Acceptance: POST /connectors/{id}/test returns ok/err without exposing secrets.

Done when:
- Connectors catalog populated; test endpoint wired to adapter shim with vault-backed secrets.

---

## Milestones & Scope

### Phase 0 — Foundations (2–3 weeks)
- OIDC login + JWT
- Users, Organizations, Platform Profiles
- Datasets CRUD + visibility
- Basic search (Postgres FTS)
- Feed table and GET /feed
- Audit logs scaffold

### Phase 1 — Connect Experience (2–3 weeks)
- Connection templates (4 platforms)
- Template renderer service
- POST /datasets/{id}/connect
- dataset.connected events

### Phase 2 — Governance & Real-time (2 weeks)
- SSE stream endpoint
- Follows + personalized feed
- Audit log queries

Out of scope MVP:
- Managed ingestion jobs
- Fine-grained ABAC/RBAC beyond roles and visibility
- Data contracts as first-class (tracked for roadmap)

---

## Non-functional Requirements
- Security: never return raw secrets; use secret references and ephemeral tokens.
- Latency: Connect render < 500 ms p95 for cached templates; Feed stream delivery < 3 s.
- Reliability: 99.9% uptime target for API; idempotent event writes.
- Observability: tracing on each request; connector test spans correlated to events.

---

## Acceptance Criteria (MVP high-level)
- Users can publish and edit dataset profiles with required fields and visibility.
- Search returns relevant datasets with filters.
- Connect returns platform-specific snippets using user platform profile and dataset source metadata.
- Feed shows events for publish/connect within SLA; SSE works in modern browsers.
- Audit logs capture actor and timestamp for connect and refresh actions.


