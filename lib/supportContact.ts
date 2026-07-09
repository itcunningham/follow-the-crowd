/** Temporary private-beta support inbox. Replace before public launch. */
export const FTC_BETA_SUPPORT_EMAIL = "support@followthecrowd.app";

export function buildAccountDeletionRequestMailto(options: {
  accountEmail: string;
  username?: string | null;
}): string {
  const subject = "Follow The Crowd — Account deletion request";
  const bodyLines = [
    "Hi FTC support,",
    "",
    "I'd like to request deletion of my Follow The Crowd account.",
    "",
    `Account email: ${options.accountEmail}`,
  ];

  const username = options.username?.trim();

  if (username) {
    bodyLines.push(`Username: ${username}`);
  }

  bodyLines.push("", "Thanks.");

  const params = new URLSearchParams({
    subject,
    body: bodyLines.join("\n"),
  });

  return `mailto:${FTC_BETA_SUPPORT_EMAIL}?${params.toString()}`;
}
