/**
 * Facts the legal pages state about who runs FTC and where data lives.
 *
 * Kept in one place so Terms and Privacy cannot disagree with each other, and so
 * changing the operator or contact is a single edit rather than a search.
 *
 * INTERNAL NOTE — not shown to users: these documents are a first pass written
 * to match the data audit, and they have NOT had professional legal review.
 * The Tokyo hosting in particular warrants an Australian privacy lawyer's eye
 * (APP 8, cross-border disclosure). See docs/qa/BETA-READINESS-CHECKLIST.md.
 */

/** Operated by an individual. FTC is not a registered company — do not imply otherwise. */
export const LEGAL_OPERATOR = "Isaac Cunningham";

export const LEGAL_CONTACT_EMAIL = "itcunningham99@gmail.com";

export const LEGAL_LAST_UPDATED = "8 August 2026";

/** Supabase project region. Drives the cross-border disclosure in the Privacy Policy. */
export const DATA_HOSTING_REGION = "AWS ap-northeast-1 (Tokyo, Japan)";
