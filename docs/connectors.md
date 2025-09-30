## Connectors — Adapter Interface and Example

### Connector interface (TypeScript)
```ts
export interface Connector {
  testConnection(config: Record<string, unknown>): Promise<{ ok: boolean; error?: string }>;
  previewSchema(config: Record<string, unknown>): Promise<{ fields: Array<{ name: string; type: string }>; sample?: number }>;
  sampleRows(config: Record<string, unknown>, opts?: { limit?: number }): Promise<Array<Record<string, unknown>>>;
  extractToTarget(
    config: Record<string, unknown>,
    targetConfig: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<{ jobId: string }>;
}
```

Notes:
- Connectors run in isolated workers with least privilege.
- Config values reference secrets by key (vault paths), not raw secrets.
- Emit events on job completion or failure with correlation ids.

### Example — Snowflake connector behavior
- `testConnection`: opens a session using a short-lived token or key reference; returns `{ok:true}` if SQL `SELECT 1` succeeds.
- `previewSchema`: lists columns for a given stage or table by querying `INFORMATION_SCHEMA`.
- `sampleRows`: runs `SELECT * FROM <table> LIMIT <N>` with safe guards.
- `extractToTarget`: executes templated SQL (from `templates/snowflake.sql.mustache`) with rendered context; returns `jobId`.

### Template rendering
- Engine: Mustache-compatible.
- Context: `{ source, target, user }` assembled by backend `POST /datasets/{id}/connect`.
- Validation: run a lint/sanity pass before returning artifacts; forbid secrets in output.


