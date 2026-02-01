## API

- POST `/runs`: Ingest a campaign spec and start a review. Returns `{ runId }`.
- GET `/runs/:id`: Fetch run metadata.
- GET `/runs/:id/report`: Fetch structured report.

Payload schemas are defined via Zod under `@sentinel/shared`.

