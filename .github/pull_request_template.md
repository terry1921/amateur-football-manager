## Description

<!-- Provide a concise summary of the changes introduced in this PR and the context/rationale behind them. -->

## Related Issues / Tickets

<!-- Link related issues or discussions (e.g. Closes #123, Fixes #456, or N/A) -->

- Closes #

## Type of Change

<!-- Please check all that apply: -->

- [ ] 🐛 **Bug fix** (non-breaking change fixing an issue)
- [ ] ✨ **New feature** (non-breaking change adding functionality)
- [ ] 🗄️ **Database migration** (SQL changes in `supabase/migrations`)
- [ ] 🛡️ **Security / RLS policy** (Tenant isolation or auth rule updates)
- [ ] 🌐 **Internationalization (i18n)** (Updates to `messages/en.json` & `messages/es.json`)
- [ ] ♻️ **Refactoring / Cleanup** (No visual or functional changes)
- [ ] 📚 **Documentation** (Updates to `docs/` or README)
- [ ] ⚙️ **CI / Infrastructure** (GitHub Actions, build tools, dependencies)

## Subsystem Impact & Verification

### 🗄️ Database & Supabase (if applicable)

- [ ] Added/modified SQL migration files in `supabase/migrations/`
- [ ] Re-generated TypeScript database types (`npm run db:types`)
- [ ] Ran local security and tenant-isolation suite (`npm run test:security`)

### 🌐 Localization (if applicable)

- [ ] Added or updated translation keys in both English (`messages/en.json`) and Spanish (`messages/es.json`)

### 📱 UI / Mobile Responsiveness (if applicable)

- [ ] Tested on mobile viewports (Mobile-first responsive design)
- [ ] Attached screenshots / video demonstration below

---

## Quality & Testing Checklist

<!-- Please ensure all applicable quality checks pass prior to requesting a review. -->

- [ ] `npm run format:check` — Code passes Prettier formatting
- [ ] `npm run lint` — ESLint completes with zero errors/warnings
- [ ] `npm run typecheck` — TypeScript compiler checks pass cleanly
- [ ] `npm test` — Vitest unit and component tests pass
- [ ] `npm run build` — Next.js production build completes successfully
- [ ] Keep PR size focused (< 1,000 lines recommended)

## How Has This Been Tested?

<!-- Describe the manual or automated testing steps you performed to verify your changes. -->

1.
2.

## Screenshots / Demos (if applicable)

<!-- Add screenshots, GIFs, or videos showing UI or behavioral changes. -->
