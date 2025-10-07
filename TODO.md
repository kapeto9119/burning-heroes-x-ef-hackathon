Platform Knowledge: persistence (make app leaner)

- Store cached platform knowledge in a small DB (SQLite/Redis/Postgres).
- Table: `platform_knowledge`
  - `id` (pk), `refreshed_at` (timestamptz), `connectors` (jsonb), `credentials` (jsonb), `version` (text)
- On boot: load latest row → hydrate in-memory cache; background refresh updates the row.
- Add endpoint/cron to persist and prune (keep last 10 snapshots).
- Fallback: use persisted summary when MCP is unreachable.


