# API Contracts — MVP

Base URL (local dev): `http://localhost:8000`

All endpoints except `/auth/register` and `/auth/login` require:
`Authorization: Bearer <access_token>`

---

## Auth

### POST /auth/register
**Request**
```json
{ "name": "Asha Verma", "email": "asha@example.com", "password": "secret123" }
```
**Response `201`**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "name": "Asha Verma", "email": "asha@example.com", "created_at": "2026-07-16T10:00:00Z" }
}
```

### POST /auth/login
**Request**
```json
{ "email": "asha@example.com", "password": "secret123" }
```
**Response `200`** — same shape as register.

---

## Transactions

### POST /transactions
Creates a manual transaction. Always starts as `pending_category`.

**Request**
```json
{ "amount": 450, "type": "expense", "date": "2026-07-14", "note": "Movie night", "merchant": "PVR" }
```
**Response `201`**
```json
{
  "id": 12, "user_id": 1, "amount": 450, "type": "expense",
  "category": null, "status": "pending_category",
  "merchant": "PVR", "date": "2026-07-14", "note": "Movie night",
  "source": "manual", "created_at": "2026-07-14T18:30:00Z"
}
```

### GET /transactions
Query params (all optional): `start_date`, `end_date`, `category`, `type`
**Response `200`** — array of transaction objects (see above).

### GET /transactions/pending
Returns transactions with `status = "pending_category"`.
**Response `200`** — array of transaction objects.

### PATCH /transactions/{id}/categorize
**Request**
```json
{ "category": "Movies" }
```
**Response `200`** — updated transaction object, `status` becomes `"categorized"`.

### PUT /transactions/{id}
Partial update. Any of: `amount`, `type`, `date`, `note`, `merchant`, `category`.
**Response `200`** — updated transaction object.

### DELETE /transactions/{id}
**Response `204`** — no body.

---

## Budgets

### GET /budgets
**Response `200`**
```json
[{ "id": 1, "user_id": 1, "category": "Movies", "monthly_limit": 1500, "created_at": "..." }]
```

### POST /budgets
**Request**
```json
{ "category": "Movies", "monthly_limit": 1500 }
```
**Response `201`** — created budget object.

---

## Advisor

### GET /advisor/monthly-insights
Query params (optional): `year`, `month` — defaults to current month.

**Response `200`**
```json
{
  "year": 2026,
  "month": 7,
  "insights": [
    {
      "category": "Movies",
      "current": 1800.0,
      "previous": 1280.0,
      "change_pct": 40.6,
      "month_label": "July",
      "prev_month_label": "June",
      "advice": "You spent 40.6% more on Movies this month (₹1800.0 vs ₹1280.0 in June) — consider setting a ₹1,500 cap for next month."
    }
  ]
}
```
`insights` is empty if no category changed by more than 15% month-over-month, or if there's no previous-month data yet.

---

## Error shape (all endpoints)
```json
{ "detail": "Human-readable message" }
```
`401` — missing/invalid token · `404` — not found / not owned by user · `400` — validation or duplicate-email error.
