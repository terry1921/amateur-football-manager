# Authentication

Matchday uses Supabase Auth with the PKCE flow provided by `@supabase/ssr`.
Authentication state is stored in Supabase-managed cookies, refreshed by the
Next.js request proxy, and verified with `auth.getUser()` before protected
server-rendered routes are returned.

## Routes

All user-facing routes are locale-prefixed (`en` or `es`):

- Public: `/{locale}/login`, `/{locale}/register`,
  `/{locale}/forgot-password`, and `/{locale}/reset-password`.
- Callback: `/{locale}/auth/callback`.
- Protected: `/{locale}/dashboard`, `/{locale}/team`,
  `/{locale}/players`, `/{locale}/matches`, `/{locale}/statistics`, and
  `/{locale}/content`.

## Local configuration

Local Supabase has email confirmations disabled and captures outgoing email in
Inbucket at `http://127.0.0.1:54324`. Registration therefore creates a session
immediately in the default local setup. Password-recovery messages can be
opened in Inbucket.

Set these values in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The local `supabase/config.toml` already allows `http://localhost:3000/**` as an
Auth redirect destination.

## Hosted and production configuration

In Supabase Authentication URL Configuration:

1. Set **Site URL** to the production application origin.
2. Add exact local, preview, and production callback patterns to **Redirect
   URLs**, including `/{locale}/auth/callback` paths.
3. Choose whether **Confirm email** is enabled. The application supports both:
   a session is used immediately when confirmation is disabled; otherwise the
   registration screen asks the user to check their email.
4. Keep password-recovery links directed through the callback route. The app
   exchanges the PKCE code there before opening the reset-password page.
5. Configure a production SMTP provider and sender before external beta; the
   built-in email service is intended only for limited evaluation.

Set `NEXT_PUBLIC_SITE_URL` to the canonical origin in production. Vercel preview
deployments fall back to `VERCEL_URL` when that variable is omitted, while local
development has one centralized `http://localhost:3000` fallback.

No custom email-template change is required when Supabase's standard
`ConfirmationURL` link is used. If templates are customized to send a
`token_hash` instead, a separate OTP-verification handler would be required and
must be implemented before deploying those templates.
