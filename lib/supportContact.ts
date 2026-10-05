export const SUPPORT_EMAIL = "followthecrowdsupport@gmail.com";

const PLACEHOLDER_OR_LEGACY_SUPPORT_EMAILS = new Set([
  "your-email@example.com",
  "itcunningham99@gmail.com",
]);

// Dedicated support inbox is the product default. Env may override for staging,
// but placeholder / personal-legacy values fall through to SUPPORT_EMAIL.
export function getSupportEmail(): string {
  const configuredEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  if (
    configuredEmail &&
    !PLACEHOLDER_OR_LEGACY_SUPPORT_EMAILS.has(configuredEmail)
  ) {
    return configuredEmail;
  }

  return SUPPORT_EMAIL;
}

export function buildAccountDeletionRequestMailto(options: {
  accountEmail: string;
  username?: string | null;
}): string {
  const subject = "Account deletion request";
  const bodyLines = [
    "Hi FTC support,",
    "",
    "I would like to request deletion of my Follow The Crowd account.",
    "",
    "Account Details:",
    `Email: ${options.accountEmail}`,
  ];

  const username = options.username?.trim();

  if (username) {
    bodyLines.push(`Username: ${username}`);
  }

  bodyLines.push("", "Thank you");

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(bodyLines.join("\n"));

  return `mailto:${getSupportEmail()}?subject=${encodedSubject}&body=${encodedBody}`;
}
