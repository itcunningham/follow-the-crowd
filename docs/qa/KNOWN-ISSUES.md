# FTC Known Issues — Coached Private Beta

Accepted limitations for the coached private beta (2026-07-16). **Not launch blockers.** Monitor through tester feedback.

**Severity:** Critical · High · **Medium** · **Low**

---

## Medium (accepted)

### KN-01 — Event detail Bookings row: DJ profile tap

| Field | Detail |
|-------|--------|
| Area | Events → Event detail → Bookings |
| Behaviour | Tapping the DJ profile on a booking row does not register |
| Workaround | Open the DJ profile from Run Sheet, DM, or other supported surfaces |
| Status | Accepted for beta |

### KN-02 — Event → Open DM → Back navigation

| Field | Detail |
|-------|--------|
| Area | Events → Open DM → Back |
| Behaviour | Back returns to Messages instead of the originating event detail |
| Workaround | Return to the event via Events list or workspace navigation |
| Status | Accepted for beta |

---

## Low (accepted)

### KN-03 — Profile tab response latency

| Field | Detail |
|-------|--------|
| Area | Bottom nav — Profile |
| Behaviour | Profile tab/icon occasionally responds more slowly than Messages |
| Workaround | Wait briefly or tap again |
| Status | Accepted for beta |

### KN-04 — Crew chat View event return path

| Field | Detail |
|-------|--------|
| Area | Crew chat → View event → Back |
| Behaviour | Return path is not always origin-preserving |
| Workaround | Use Events or Messages to return to prior context |
| Status | Accepted for beta |

### KN-05 — Secondary Run Sheet / profile return paths

| Field | Detail |
|-------|--------|
| Area | Run Sheet, profile deep links |
| Behaviour | Some secondary return paths land on event detail rather than prior screen |
| Workaround | Use main nav to reach intended destination |
| Status | Accepted for beta |

### KN-06 — Event name and venue character limits

| Field | Detail |
|-------|--------|
| Area | Event create/edit |
| Behaviour | Event name and venue do not have sensible character caps |
| Workaround | Keep names concise manually |
| Status | Accepted for beta |

---

## Out of scope (not bugs for this beta)

- AI event generation (disabled)
- Payments
- Discover expansion
- Social features beyond existing DMs and crew chat
- Public/open signup

---

## Reporting new issues

Use [BUG-TEMPLATE.md](./BUG-TEMPLATE.md). **Critical** or **High** production defects pause tester onboarding until triaged (see [PRIVATE-BETA-GO-LIVE.md](./PRIVATE-BETA-GO-LIVE.md)).
