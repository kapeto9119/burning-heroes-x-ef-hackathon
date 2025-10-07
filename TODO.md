Platform Knowledge: persistence (make app leaner)

- Store cached platform knowledge in a small DB (SQLite/Redis/Postgres).
- Table: `platform_knowledge`
  - `id` (pk), `refreshed_at` (timestamptz), `connectors` (jsonb), `credentials` (jsonb), `version` (text)
- On boot: load latest row → hydrate in-memory cache; background refresh updates the row.
- Add endpoint/cron to persist and prune (keep last 10 snapshots).
- Fallback: use persisted summary when MCP is unreachable.


MVP IA Alignment (beyond Projects)

- Test Run (Sandbox)
  - Frontend: `/projects/:id/test` with trigger simulator and step-through runner
  - Backend: simulate/proxy n8n runs; per-node logs endpoint

- Runs & Logs
  - Frontend: `/projects/:id/runs` and `/runs/:runId` (list + detail)
  - Backend: runs list/detail endpoints (or proxy)

- Deploy & Schedule
  - Frontend: `/projects/:id/deploy` with diff vs last deployed, credential checks, warnings
  - Reuse `ScheduleDialog`; show cron status and next run time

- Editor/Chat Enhancements
  - AI Plan panel (steps/nodes/assumptions), “Regenerate step n”, “Sample payloads”

- Canvas UX
  - Schema-aware node inspector; inline “Test node” with sample payload

- Connections Integration
  - Detect missing creds → deep-link to `/integrations`; inline connect picker

- Templates
  - Selecting a template pre-fills plan and routes to `/projects/:id/plan`

- Observability (basic)
  - On workflows list: last run, success rate, P95 per-node; simple alert toggle

- Webhooks
  - After deploy, show webhook URLs, sample curl, and signature guidance

- Cleanup
  - Redirect `/settings` → `/integrations`; surface usage/limits on `/billing`
