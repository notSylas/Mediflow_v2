# MediFlow Postman Collection

Import these two files into Postman:

- `MediFlow_v2_Local.postman_environment.json`
- `MediFlow_v2_API.postman_collection.json`

## Local Setup

Run the app and database first:

```bash
docker compose up -d postgres
npm run dev
```

Base URL:

```text
http://localhost:3000
```

## Auth Cookies

Most API routes use Better Auth session cookies.

1. Login in the browser as a patient.
2. Open DevTools -> Network.
3. Click any authenticated request.
4. Copy the full `Cookie` request header.
5. Paste it into the Postman environment variable `patientCookie`.
6. Repeat with a doctor login for `doctorCookie`.

Use the full cookie string, for example:

```text
better-auth.session_token=...; other_cookie=...
```

## Recommended Test Order

1. `Setup / Unauthenticated guard sample`
2. `Patient / Patient home`
3. `Patient / Get available slots`
4. `Patient / Book appointment`
5. `Patient / Start payment`
6. `Doctor / Doctor home`
7. `Doctor / Doctor appointments`
8. `Messaging / List conversations`

The collection saves common IDs automatically:

- `startsAt`
- `appointmentId`
- `conversationId`
- `patientId`
- `reportId`
- `attachmentId`
- `prescriptionId`
- `ruleId`
- `overrideId`

## Expected Status Codes

- `401`: missing session cookie
- `403`: wrong role or feature not open yet
- `400`: invalid payload
- `404`: ID not found or inaccessible
- `409`: state conflict, such as already booked slot or already issued prescription
