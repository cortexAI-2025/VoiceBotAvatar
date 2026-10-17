# AIWorkPay Voice Engine — Architecture V2 (Google-first, provider-agnostic)

**Status:** architecture specification only; not implemented, tested, or deployed. Preserve the existing FastAPI + Next.js sample until the migration is verified.

## Product
A multi-tenant SaaS voice-agent studio: each organization configures agents, brand, languages, knowledge, approved business tools, voice, optional avatar and usage budgets. EVE 2027 is out of scope.

## Design principles
- Google Cloud/Gemini is the preferred provider, **not** a hard dependency. Retain an OpenAI adapter and allow other providers later.
- Separate dialogue, speech recognition, speech synthesis, knowledge retrieval, and avatar rendering.
- Do not assume any Google API supports live avatar generation, unrestricted voice cloning, or viseme timing. Verify current availability, pricing, regions, quotas, licensing and SDKs before implementing.
- Do not couple the avatar frame rate to the conversational runtime.
- Never silently fall back from a tenant-selected voice to a different voice without visible disclosure.

## Reference architecture
- **Frontend:** Next.js studio, embeddable widget, optional avatar viewer; signed short-lived session tokens.
- **Backend:** FastAPI tenant-aware REST/WebSocket gateway; provider routing, policy enforcement and usage accounting.
- **Realtime dialogue:** Gemini Live API adapter as preferred; OpenAI realtime/Agents SDK adapter retained as fallback. Verify session and tool-calling semantics per provider.
- **STT:** Gemini Live input transcription when available, or Google Cloud Speech-to-Text adapter.
- **TTS:** Gemini TTS or Google Cloud Text-to-Speech adapter; store voice locale, provider and supported features. Latency benchmark required.
- **Knowledge:** ingestion into Google Cloud Storage; Vertex AI Search/RAG or an interchangeable vector retrieval adapter, always tenant-scoped.
- **Data:** PostgreSQL (Cloud SQL or existing managed Postgres); migrations, backups and tenant-isolation tests.
- **Media:** private object storage, signed URLs, retention rules.
- **Avatar:** optional 2D photo/3D blendshape adapter, driven by audio and timestamps; Google video generation is not assumed suitable for low-latency live lipsync. Investigate live-avatar services only after verifying API access and rights.
- **Voice cloning:** optional restricted adapter; gated by verified provider eligibility, speaker identity/consent, explicit enrollment, revocation, deletion and anti-impersonation safeguards. Never promise instant cloning.

## Interfaces (implementation targets)
- DialogueProvider.start_session(config, tools, context) / send_audio / receive_events / interrupt / close
- SpeechProvider.transcribe(audio, locale) / synthesize(text, voice, locale)
- KnowledgeProvider.ingest(tenant, source) / retrieve(tenant, agent, query, acl)
- AvatarProvider.render_stream(audio, timing, avatar_config) / stop
- VoiceEnrollmentProvider.enroll(consent_artifact, recordings) / revoke / delete
- ToolRegistry.execute(tenant, agent, action, arguments, actor_permissions)

Provider capabilities must be advertised and validated at configuration time. Unsupported features are disabled in the UI, not emulated deceptively.

## Tenant data model
- organizations(id, name, plan, status)
- memberships(id, organization_id, user_id, role)
- agents(id, organization_id, name, instructions, locale, dialogue_provider, stt_provider, tts_provider, voice_id, avatar_id, status)
- provider_credentials(id, organization_id, provider, encrypted_secret_ref)
- tool_connections(id, organization_id, provider, encrypted_secret_ref)
- agent_tool_permissions(agent_id, tool_connection_id, allowed_actions)
- knowledge_sources(id, organization_id, agent_id, storage_ref, indexing_status, acl)
- avatars(id, organization_id, owner_id, media_ref, type, consent_ref, status)
- voice_profiles(id, organization_id, owner_id, provider, voice_ref, consent_ref, status)
- voice_sessions(id, organization_id, agent_id, actor_id, started_at, ended_at, status)
- usage_events(id, organization_id, session_id, provider, metric, quantity, estimated_cost)
- audit_events(id, organization_id, actor_id, action, resource_id, timestamp)

## Security and privacy
- Authenticate every HTTP and WebSocket session; derive tenant from server-side membership.
- Enforce organization-scoped queries, storage paths, vector retrieval and tool credentials; use database RLS where appropriate.
- Reject cross-tenant agent, voice, avatar, document and tool IDs.
- Consent and rights verification for any uploaded face or voice; explicit disclosure of synthetic media.
- Separate revocation and erasure workflows for biometric media and embeddings; data-minimization, retention and GDPR/DPIA assessment before launch.
- Require explicit user approval for payments, legal commitments and public statements.
- Encrypt secrets; apply per-tenant quotas, abuse prevention, audit logs, cost alerts and kill switches.
- Test prompt injection through retrieved documents and tools; tools execute only allowlisted operations.

## MVP delivery stages
1. Inventory current sample code and build baseline tests; benchmark existing voice path.
2. Implement org membership, tenant authorization, database migrations and cross-tenant negative tests.
3. Implement Google dialogue/STT/TTS adapters behind provider interfaces; retain OpenAI fallback.
4. Implement tenant-scoped document ingestion/retrieval and business tool registry with test doubles.
5. Add studio configuration, embeddable widget, usage metering, budget controls and consent screens.
6. Pilot 2D/3D avatar with measurable end-to-end latency; defer video-based generation.
7. Add voice enrollment/cloning only after provider access and legal/privacy controls are confirmed.

## MVP acceptance criteria
- Two organizations can configure distinct agents, voices, knowledge and credentials without leakage.
- Cross-tenant HTTP, WebSocket, retrieval and tool calls fail closed in automated tests.
- A French live voice session streams end-to-end and can be interrupted.
- Knowledge answers can cite permitted tenant documents and cannot retrieve another tenant's files.
- Tool calls are permissioned, logged and tested against prompt injection.
- Usage is metered per tenant with enforced budgets.
- Optional avatar can be disabled without affecting voice conversation.
- No voice cloning without recorded, revocable, verified consent.
- No production rollout without performance, privacy, security and cost reviews.

## Open decisions
- AIWorkPay identity/SSO integration and hosting ownership
- Google Cloud project, billing, regional availability and quotas
- Target latency and acceptable cost per voice minute
- Consent evidence retention, deletion SLA and biometric data handling
- Supported locales and required avatar fidelity
