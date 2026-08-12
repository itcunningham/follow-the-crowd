/**
 * Validate that a notification link is a safe internal app route.
 * Push notification links must only resolve to Follow The Crowd internal paths,
 * never external URLs or dangerous protocols.
 *
 * Safe: /dm/123, /events, /bookings
 * Unsafe: //evil.com, http://steal-data.com, javascript:, data:
 */
export function isValidNotificationLink(link: unknown): boolean {
  // Null/undefined is safe—defaults to home
  if (!link) return true;

  // Must be a string
  if (typeof link !== "string") return false;

  const trimmed = link.trim();

  // Empty string is safe—defaults to home
  if (trimmed === "") return true;

  // Reject protocol-relative URLs (//evil.com becomes http://evil.com in context)
  if (trimmed.startsWith("//")) return false;

  // Reject absolute URLs with protocol (http://, https://, ftp://, etc.)
  if (trimmed.includes("://")) return false;

  // Reject javascript: and other pseudo-protocol attacks
  if (trimmed.toLowerCase().startsWith("javascript:")) return false;
  if (trimmed.toLowerCase().startsWith("data:")) return false;
  if (trimmed.toLowerCase().startsWith("vbscript:")) return false;

  // Only allow absolute paths starting with /
  if (!trimmed.startsWith("/")) return false;

  // Reject encoded/escaped protocol attempts
  try {
    const decoded = decodeURIComponent(trimmed);
    // Check decoded version for attacks (handles %2F%2F attacks)
    if (decoded !== trimmed) {
      // Re-run checks on decoded version
      if (decoded.startsWith("//") || decoded.includes("://")) {
        return false;
      }
      if (decoded.toLowerCase().startsWith("javascript:")) {
        return false;
      }
    }
  } catch (e) {
    // Malformed URI encoding—reject it
    return false;
  }

  return true;
}
