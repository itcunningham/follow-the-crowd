"use client";

import {
  buildAccountDeletionRequestMailto,
  FTC_BETA_SUPPORT_EMAIL,
} from "@/lib/supportContact";

export default function RequestAccountDeletionSection({
  accountEmail,
  username,
}: {
  accountEmail: string | null;
  username: string | null;
}) {
  const mailtoHref =
    accountEmail !== null
      ? buildAccountDeletionRequestMailto({
          accountEmail,
          username,
        })
      : null;

  return (
    <section className="ftc-card p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">Support</h2>
      <p className="mt-2 text-sm text-ftc-text-muted">
        We&apos;ll help you close your account and remove your data.
      </p>
      {mailtoHref ? (
        <a
          href={mailtoHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-ftc-border-strong bg-ftc-bg-elevated/60 px-4 py-3 text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong hover:bg-ftc-bg-elevated"
        >
          Request account deletion
        </a>
      ) : (
        <p className="mt-4 text-sm text-ftc-text-muted">
          Email unavailable. Contact {FTC_BETA_SUPPORT_EMAIL} to request account deletion.
        </p>
      )}
    </section>
  );
}
