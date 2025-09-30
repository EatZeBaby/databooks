## Connection Templates

Engine: Mustache-compatible placeholders using `{{source.*}}`, `{{target.*}}`, `{{user.*}}`.

Context object example:
```json
{
  "source": {"type":"s3","path":"s3://bucket/prefix","stage":"MY_STAGE", "format":"parquet"},
  "target": {"platform":"snowflake","database":"ANALYTICS","schema":"PUBLIC","table":"ORDERS"},
  "user": {"name":"Alice","email":"alice@example.com"}
}
```

Security notes:
- Do not embed raw secrets. Use secret references or instructions.
- Prefer temporary credentials and time-limited tokens for tests.


