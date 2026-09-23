# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## Room Hisaab (Kiraya Manager)
- Owner (landlord): vishvendra9660@gmail.com — landlord app has NO login (single-owner web app)
- Tenant portal: /tenant — login = tenant phone + 4-digit PIN (PIN set by landlord in Room form field "Tenant PIN")
- No seeded accounts. For tenant-portal testing: create own test room with known phone/pin, then POST /api/tenant/login {"phone","pin"} → JWT → GET /api/tenant/khata with "Authorization: Bearer <token>"
- REAL data (DO NOT DELETE): property "Shree shyam Bhawan", room G/02, tenant Balram, phone 87693 34296
