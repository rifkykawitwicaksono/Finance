# Security checklist

- Never ship the Supabase service-role key in a mobile app.
- Keep the phone allowlist in a server-only schema/table and deny client grants.
- Test direct REST calls, not just the UI: a third phone must fail auth; anonymous users must not read any table or object; authenticated non-members must be denied.
- Use RLS on every table and a private Storage bucket.
- Treat locations, voice notes, images, and call metadata as sensitive. Use explicit consent, expiration, and deletion controls.
- Configure SMS OTP rate limits/CAPTCHA and monitor abuse.
- Do not rely on client-side phone checks, hidden screens, or obscure URLs as security controls.
