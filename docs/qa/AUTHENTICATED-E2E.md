# Authenticated production E2E (Playwright)

Repeatable authenticated QA against production without manual browser logins.

## One-time local setup

1. Copy the example credential file:

```bash
cp .env.qa.local.example .env.qa.local
chmod 600 .env.qa.local
```

2. Fill **six synthetic QA account values** (no real user data):

```env
FTC_QA_PLANNER_EMAIL=
FTC_QA_PLANNER_PASSWORD=
FTC_QA_DJ_EMAIL=
FTC_QA_DJ_PASSWORD=
FTC_QA_BOTH_EMAIL=
FTC_QA_BOTH_PASSWORD=
```

3. Install Playwright browsers once (WebKit — matches the iPhone 13 device profile in `playwright.config.ts`):

```bash
npm run qa:e2e:install
```

This installs **Playwright WebKit emulation**, not a physical iPhone Safari browser.

## Run authenticated production regression

```bash
npm run qa:preflight
npm run qa:e2e:prod
```

Default base URL: `https://follow-the-crowd.vercel.app`

Optional override in `.env.qa.local`:

```env
FTC_QA_BASE_URL=https://follow-the-crowd.vercel.app
```

## Secret handling

- `.env.qa.local` is gitignored and must never be committed.
- Playwright storage states live in `test-results/.auth/` (gitignored) and are deleted after each run.
- Traces and videos are disabled during auth setup to avoid credential capture.
- Failure screenshots exclude credential fields by using post-login journeys only in specs.
- Preflight verifies ignore rules: `npm run qa:preflight`.

## What the harness covers

| Journey | Spec area |
|---------|-----------|
| Event creation (full required fields incl. set times) | `e2e/journeys/authenticated-prod.spec.ts` |
| Fixed-offer booking | same |
| Open-offer booking | same |
| DM send/receive + unrelated access denial | same |
| Crew-chat authorization | same |
| Targeted navigation return paths | same |

Auth setup (`e2e/auth.setup.ts`) logs in Planner, DJ and Both through the production UI, verifies role from visible state, and writes temporary storage states.

## Rerun a failed journey only

```bash
npx playwright test e2e/journeys/authenticated-prod.spec.ts -g "open-offer"
npx playwright test e2e/journeys/authenticated-prod.spec.ts -g "DM, realtime"
```

Booking journeys run serially inside their describe block. DM, crew-chat and navigation describe blocks run independently — a booking-journey failure no longer skips unrelated messaging or navigation tests.

Or open the HTML report after a run:

```bash
npx playwright show-report
```

## Playwright WebKit vs physical iPhone Safari

- **Playwright mobile viewport / WebKit** validates responsive layout and touch-target flows in automation. It does **not** replace physical iPhone Safari checks for safe-area insets, native keyboard behaviour, or OS-level back gestures.
- After this harness passes, run the physical iPhone checklist in `docs/qa/TEST-PLAN.md` (mobile section) for items marked iPhone-only.

## Cleanup behaviour

- Tests create recognisable `QA-BETA-*` data through supported UI flows only.
- No service-role deletes or direct database cleanup.
- If automated cleanup is unavailable, note created event names/IDs from test output for manual removal.
- Temporary auth files are removed in `e2e/global-teardown.ts`.

## Architecture

```
e2e/
  auth.setup.ts          # UI login → storage state (3 roles)
  global-teardown.ts     # delete storage states
  fixtures/              # multi-role browser contexts
  helpers/               # credentials, login, event form, evidence
  journeys/              # serial production regression specs
playwright.config.ts
scripts/qa-preflight.mts
.env.qa.local.example
```

## Credential blocker

If `.env.qa.local` is missing, `npm run qa:e2e:prod` exits before tests with a clear message. The harness is still valid — populate credentials once locally, then re-run.
