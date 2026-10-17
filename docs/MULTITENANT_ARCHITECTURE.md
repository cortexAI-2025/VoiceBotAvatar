# AIWorkPay Voice Engine — Architecture MVP

Status: design proposal, not implemented. Existing OpenAI Agents SDK demo remains unchanged.

## Goal
Turn VoiceBotAvatar into a multi-tenant voice platform. Each company configures agents, voices, knowledge, tools, and usage limits independently. Avatar is optional.

## Architecture
- Next.js dashboard and embeddable voice widget
- FastAPI authentication and tenant-aware REST/WebSocket gateway
- OpenAI Agents SDK runtime with per-agent tool allowlists
- PostgreSQL with tenant-scoped data and row-level security where appropriate
- Worker for asynchronous ingestion and reporting
- Provider abstraction for STT, TTS and real-time voice; avoid storing raw audio by default

## Domain model
- organizations(id, name, status, plan)
- memberships(id, organization_id, user_id, role)
- agents(id, organization_id, name, instructions, language, voice_id, status)
- tool_connections(id, organization_id, provider, secret_reference, status)
- agent_tool_permissions(agent_id, tool_connection_id, permitted_actions)
- knowledge_sources(id, organization_id, agent_id, status)
- voice_sessions(id, organization_id, agent_id, actor_id, started_at, ended_at)
- usage_events(id, organization_id, session_id, provider, units, cost_estimate)
- audit_events(id, organization_id, actor_id, action, resource_id, created_at)

All tenant-owned tables have organization_id and appropriate indexes. Server derives tenant from authenticated membership; never trust a client-provided tenant ID.

## Security requirements
- Authenticate WebSocket handshake and validate agent access before starting a session.
- Enforce tenant isolation at database, cache, storage, retrieval and tool execution boundaries.
- Secrets encrypted, never sent to browser; scoped OAuth credentials per tenant.
- Server-side tool allowlists, explicit confirmation for money/legal/public actions.
- Rate limits, per-tenant budgets, token expiry, audit trails, redacted logs.
- Consent, retention/deletion controls for transcripts and recordings; GDPR review.
- No cross-tenant retrieval or shared conversation state.

## API draft
- POST /v1/organizations
- GET/PATCH /v1/organizations/{org_id}
- GET/POST /v1/organizations/{org_id}/agents
- GET/PATCH /v1/agents/{agent_id}
- POST /v1/agents/{agent_id}/sessions (short-lived signed session token)
- WS /v1/voice/sessions/{session_id} (authenticated)
- GET /v1/organizations/{org_id}/usage
- POST /v1/agents/{agent_id}/tools/{tool_id}/test (sandbox only)

## Milestones
1. Inventory current code, dependencies, tests, and websocket protocol.
2. Tenant model + auth + authorization + migrations + negative isolation tests.
3. Per-agent configuration and controlled tool registry with mocks.
4. Widget, observability, cost metering, quota enforcement.
5. Optional avatar adapter, without coupling it to voice runtime.

## Acceptance criteria for MVP
- Two organizations can configure different agents and tool credentials.
- Cross-tenant reads, WebSocket sessions, tool calls and retrieval all fail closed.
- One voice session runs end-to-end with streaming and cancellation.
- Tools cannot execute without explicit per-agent permissions.
- Costs and session metrics are attributable to the correct tenant.
- Automated integration and security tests pass; no production deploy until reviewed.

## Open questions
- Identity provider and existing AIWorkPay SSO
- Postgres hosting and operational ownership
- Voice provider pricing and latency targets
- Data residency, transcript retention and enterprise requirements
