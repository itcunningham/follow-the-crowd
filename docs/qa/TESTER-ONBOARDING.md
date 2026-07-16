# FTC Coached Private Beta — Tester onboarding

Welcome to the **Follow The Crowd (FTC)** coached private beta. This guide covers what to expect, how to report problems, and how to find the app version.

---

## What you are testing

- A small, coached beta for **Planner/DJ pairs** who already work together
- Core flows: profiles, events, booking requests, messaging, calendar, and gigs
- **Not in scope:** payments, AI event generation, public launch, or broad social features

See [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) for accepted limitations that are **not** treated as launch blockers.

---

## Before you start

1. Use the invitation or signup instructions Isaac shared with your pair.
2. Complete onboarding and choose your role (Planner, DJ, or both).
3. Test **mobile-first** when you can — many flows are designed for ~390px width.
4. Keep test credentials and passwords **private** — do not post them in feedback channels.

---

## App version and build identifier

Open **Settings** (from your profile). At the bottom of the page you will see a line like:

**FTC Private Beta 0.9.0 · Build abc1234**

| Part | Meaning |
|------|---------|
| `0.9.0` | Private-beta product version |
| `Build abc1234` | Short identifier for the exact deployment you are using |

**Always include this full line** when reporting a bug or asking for support. It helps us match your report to the correct release.

On local developer machines the build may show **`Local`** instead of a commit hash — that is expected.

---

## Version policy

| Rule | Detail |
|------|--------|
| Private beta starts at | **`0.9.0`** |
| Bug-fix releases | Increment the **patch** version (e.g. `0.9.0` → `0.9.1`) |
| Build identifier | Distinguishes exact deployments; changes on every Vercel deploy |
| Version bumps | Require release documentation in `docs/qa/` and an updated `package.json` |

Do **not** use `1.09` or other formats — the product version is semver-style **`0.9.x`** during private beta.

---

## Reporting a problem

1. Copy the version line from **Settings**.
2. Use [BUG-TEMPLATE.md](./BUG-TEMPLATE.md) — fill in steps, expected vs actual, role, and device.
3. Send the report through the feedback channel Isaac confirmed for your cohort.

**Critical** or **High** issues (auth broken, data exposure, core flow blocked) should be reported as soon as possible.

---

## Support and account deletion

- **Settings → Support** — request account deletion via email if needed
- Support contact: see Isaac’s invite or `NEXT_PUBLIC_SUPPORT_EMAIL` in production

---

## Related

- [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md) — go-live record and operational checklist
- [BUG-TEMPLATE.md](./BUG-TEMPLATE.md) — bug report format
- [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) — accepted limitations
