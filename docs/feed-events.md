## Feed & Real-time Events — Contract

### Event types
- dataset.published
- dataset.refreshed
- dataset.schema.changed
- dataset.connected
- user.followed
- contract.signed (post-MVP display)

### Normalized event shape
```json
{
  "id": "uuid",
  "type": "dataset.connected",
  "actor": { "id": "uuid", "name": "Alice" },
  "dataset": { "id": "uuid", "name": "orders_daily" },
  "org_id": "uuid",
  "payload": { "platform": "snowflake", "details": { } },
  "created_at": "2025-09-26T12:34:56Z"
}
```

Notes:
- Payload is event-type specific but MUST avoid secrets; only include references or ephemeral tokens.
- Store raw event in `events` table; denormalize a subset for fast feed reads.

### HTTP feed (pagination)
- Endpoint: `GET /api/v1/feed?cursor=<opaque>&limit=50`
- Response includes an opaque `cursor` for next page.

### SSE stream
- Endpoint: `GET /api/v1/feed/stream`
- Content-Type: `text/event-stream`
- Event format:

```
event: dataset.connected
id: 0e0b1a7d-3f4b-4d65-9c69-4a2d8ecb7d10
data: {"id":"0e0b...","type":"dataset.connected", "actor": {"id":"...","name":"..."}, "dataset": {"id":"...","name":"..."}, "org_id":"...","payload": {"platform":"snowflake"}, "created_at":"..."}

```

### Personalization
- Include events from followed datasets and users.
- Filter by `org_id` and user visibility/policies.
- MVP ranking: purely recency; followed items appear first within the same time window.

### SLA
- Stream delivery p95 < 3 seconds.
- Persistence write within 500 ms.


