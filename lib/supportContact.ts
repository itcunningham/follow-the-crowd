const SUPPORT_EMAIL_DEV_FALLBACK = "your-email@example.com";

// Vercel production must set NEXT_PUBLIC_SUPPORT_EMAIL to the real private-beta inbox.
export function getSupportEmail(): string {
  const configuredEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  if (configuredEmail) {
    return configuredEmail;
  }

  return SUPPORT_EMAIL_DEV_FALLBACK;
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
