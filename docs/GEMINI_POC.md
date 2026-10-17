# Gemini voice POC — local development only

This is **not Gemini Live**. The browser provides speech recognition and speech synthesis, while the backend uses Gemini for text generation. No production authentication, tenant isolation, or usage quota exists yet.

## Run locally
1. From the repository root: `make sync` (installs frontend and server dependencies).
2. Set `GEMINI_API_KEY` in your local environment; never commit it.
3. Set `ENABLE_GEMINI_POC=true` **only for local testing**. Keep it unset in public deployments.
4. Start with `make serve`; visit `http://localhost:3000/gemini`.
5. Optional: `NEXT_PUBLIC_VOICE_API_URL=http://localhost:8000`.

The API endpoint is `POST /api/gemini/chat`. The server uses `GEMINI_MODEL` (default `gemini-2.5-flash`); check model availability and billing in your Google project. Browser microphone support varies. The text field remains usable without speech recognition.

## Limitations
- This endpoint has **no authentication** and must not be exposed publicly.
- Browser voices are not Google Cloud TTS and vary by device.
- No streaming, interruption of generation, conversation history, business tools or knowledge retrieval yet.
- No multi-tenant data separation or administration studio yet.
- No avatar, lipsync or voice cloning yet.
- Google SDK and model compatibility, lint, build and end-to-end tests remain to be validated in CI and on a local machine.

## Next implementation milestones
1. Test/build and fix SDK integration; add health and provider failure tests.
2. Implement tenant auth, organization memberships, Postgres migrations and isolation tests before enabling public API access.
3. Add Gemini Live adapter with bidirectional audio streaming and server-side ephemeral sessions.
4. Add tenant-scoped knowledge and allowlisted tools.
5. Add administration studio, quota metering and optional avatar adapter.
