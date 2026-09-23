# Auth Testing Playbook — Room Hisaab (Tenant Portal)

Adapted from the Custom JWT Authentication playbook (integration_expert). Landlord app has NO login (single-owner web app). The only auth is the **Tenant Portal**:

## Model
- Each Room document has `tenant_phone` and `tenant_pin` (4-digit, set by landlord in room form).
- `POST /api/tenant/login` {phone, pin} → normalizes phone to last 10 digits, matches an OCCUPIED room, returns JWT `{sub: room_id, type: "tenant", exp: +30 days}` signed HS256 with `JWT_SECRET` from backend/.env.
- `GET /api/tenant/khata` with `Authorization: Bearer <token>` → returns ONLY that room's ledger summary, month-wise rows and payment history. No other rooms' data is reachable with a tenant token. `tenant_pin` is never returned in any response.

## curl test
```
TOKEN=$(curl -s -X POST http://localhost:8001/api/tenant/login -H "Content-Type: application/json" -d '{"phone":"<tenant_phone>","pin":"<4digit>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s http://localhost:8001/api/tenant/khata -H "Authorization: Bearer $TOKEN"
```
Expect: 200 with summary/rows/payments of only the matching room. Wrong phone/pin → 401 "Phone ya PIN galat hai". Missing/expired token → 401.

## Cross-tenant isolation test
1. Create two rooms A (phone/pin A) and B (phone/pin B).
2. Login as A; fetch /api/tenant/khata; assert room_number == A's room and payments list contains only A's payments.
