# PRD — Room Hisaab (Kiraya & Bijli Manager)

## Original Problem Statement (Hindi)
"Mujhe ek app chahiye jo ki meri property me bane huye room ka hisab rak sake jisme ki room starting date honi chahiye, bijli ka unit ka hisab jud jaye, monthly reminder bhej de aur agar koi room khali ho gaya ho to app me dikhe."

## User Choices (from ask_human)
- Language: Hindi + English mix (Hinglish labels)
- Reminders: In-app reminder + WhatsApp/SMS → implemented as WhatsApp click-to-chat links (no API key needed) + in-app reminder list
- Bijli bill: unit reading + rate se auto calculation
- Rent payment record: paid/pending status
- Multiple properties alag-alag

## Personas
- **Landlord (Mukhiya user)**: 1 ya zyada properties ke rooms kiraye par deta hai; rent, bijli, khali rooms ka hisaab rakhna chahta hai; smartphone se WhatsApp use karta hai.

## Core Requirements (static)
1. Multiple properties (name, address, notes) with room counts
2. Rooms: number, rent, security, tenant name/phone, start date, occupied/vacant status
3. Vacant rooms highlighted (dashed border + KHALI badge + dashboard banner)
4. Electricity: purana/naya unit + rate → auto bill (units × rate), per month, paid/baaki toggle
5. Rent ledger: per room per month paid/pending, method (cash/UPI/bank), date
6. Monthly reminders: dashboard dues list + WhatsApp button with pre-filled Hinglish message
7. Vacate action: tenant clear, room khali mark

## Architecture
- Backend: FastAPI (/app/backend/server.py), MongoDB via motor (MONGO_URL, DB_NAME from .env), uuid string ids (no ObjectId serialization risk), collections: properties, rooms, readings, payments
- Key endpoints: /api/properties CRUD, /api/rooms CRUD + /rooms/{id}/vacate, /api/readings CRUD (upsert by room+month), /api/payments CRUD (upsert by room+month), /api/dashboard?month=
- Frontend: React (CRA + craco), react-router pages: Dashboard(/), Properties, Rooms, Bijli(/bijli), Rent(/rent); shadcn/ui + tailwind; fonts: Plus Jakarta Sans + Inter; palette: slate-900 + emerald/amber/rose accents
- Upsert semantics: one reading & one payment per (room_id, month)

## Implemented (Sep 2026)
- All of the above, tested: iteration_1 (20/20), iteration_2 ledger (11/11), iteration_3 tenant portal + notes + PWA (25/25), iteration_4 PIN lockout + report + archive (30/30)
- **Iteration 2 — Running Khata (ledger) model**: rent auto-accrues every month while room occupied; bijli = cumulative readings (current − last saved) × rate; per-room total balance; PARTIAL payments; Khata page (/rent); dashboard Kul Bakaya
- **Iteration 3 — Tenant Portal + Notes + PWA**: /tenant page, phone + 4-digit PIN login (PIN set per room by landlord, JWT 30-day, tenant sees ONLY own room); payment & reading notes; payment methods Cash/UPI/Bank Transfer/NetBanking/Cheque; prominent payment history; PWA manifest + sw.js + icons → "App download karein" install button
- **Iteration 4 — Suraksha + Report + Purana Khata**: tenant login lockout (5 galat PIN → 15 min lock, per phone); Mahine ka Report page (/report?month=, print/PDF via window.print(), summary + per-room table + totals); Purane Kirayedaar archive (vacate par khata past_tenants me save, Khata page section + detail dialog)
- **Iteration 5 — Rent cycle fix**: mid-month start (jaise 24 Aug) par starting mahina bill nahi hota — rent agle mahine se judta hai (23 Sep ko 1 mahina pura); 1 tarikh ko aaye to wahi mahina bhi gina jata hai; future start = 0 mahine. Verified user's real room G/001 (start 24 Aug → 1 mahina)
- **Iteration 6 — Bijli current-only + opening unit, Room tap detail, Report date-range**: Bijli me sirf aaj ka meter reading + date (purana auto); pehli baar occupancy par "Shuruaati unit" (opening reading, ₹0 bill) taaki agli baar (meter−opening)×rate; kisi bhi room par tap → poora hisaab modal (summary + month table + saari bijli entries + payment history + delete + pay); Report me single room ya "Saare rooms" + start–end date period, totals + payment history + Print/PDF. Backend: /api/readings dated (no month upsert), /api/rooms/{id}/detail, /api/report?start_date&end_date&room_id. Month-row bijli ab same-month ke sab readings sum karta hai. Tested 38/38 + fix verified
- Real data in DB: property "Shree shyam Bhawan", rooms G/001..G/005 — user's own records, do not delete
- Note: native APK not buildable in this environment; PWA install is the download mechanism (works like an app on Android/iOS home screen)

## Backlog / Prioritized
- P2: Native APK via Capacitor build (needs Android SDK pipeline)
- P2: Report route protection (aggregate data currently public with URL)
- P2: past_tenants pagination + index
- P2: Email/SMS automated reminders (needs Resend/Twilio key)
- P2: Dialog aria-describedby a11y polish
