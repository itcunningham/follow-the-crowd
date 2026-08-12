import { isValidNotificationLink } from "./validateNotificationLink";

describe("isValidNotificationLink", () => {
  // Safe internal paths
  describe("safe links", () => {
    it("allows absolute paths", () => {
      expect(isValidNotificationLink("/dm/123")).toBe(true);
      expect(isValidNotificationLink("/events")).toBe(true);
      expect(isValidNotificationLink("/bookings")).toBe(true);
      expect(isValidNotificationLink("/profile/user-123")).toBe(true);
    });

    it("treats null/undefined as safe (defaults to home)", () => {
      expect(isValidNotificationLink(null)).toBe(true);
      expect(isValidNotificationLink(undefined)).toBe(true);
    });

    it("treats empty string as safe (defaults to home)", () => {
      expect(isValidNotificationLink("")).toBe(true);
      expect(isValidNotificationLink("   ")).toBe(true);
    });

    it("rejects non-string values except null/undefined", () => {
      expect(isValidNotificationLink(123 as any)).toBe(false);
      expect(isValidNotificationLink({} as any)).toBe(false);
      expect(isValidNotificationLink([] as any)).toBe(false);
    });
  });

  // Dangerous links
  describe("dangerous links", () => {
    it("rejects protocol-relative URLs", () => {
      expect(isValidNotificationLink("//evil.com")).toBe(false);
      expect(isValidNotificationLink("//evil.com/path")).toBe(false);
    });

    it("rejects absolute URLs with protocol", () => {
      expect(isValidNotificationLink("http://evil.com")).toBe(false);
      expect(isValidNotificationLink("https://evil.com")).toBe(false);
      expect(isValidNotificationLink("ftp://evil.com")).toBe(false);
      expect(isValidNotificationLink("ws://evil.com")).toBe(false);
    });

    it("rejects javascript: pseudo-protocol", () => {
      expect(isValidNotificationLink("javascript:alert('xss')")).toBe(false);
      expect(isValidNotificationLink("JavaScript:alert('xss')")).toBe(false);
      expect(isValidNotificationLink("javascript:void(0)")).toBe(false);
    });

    it("rejects data: URIs", () => {
      expect(isValidNotificationLink("data:text/html,<script>alert('xss')</script>")).toBe(false);
      expect(isValidNotificationLink("data:image/png;base64,...")).toBe(false);
    });

    it("rejects vbscript: pseudo-protocol", () => {
      expect(isValidNotificationLink("vbscript:msgbox('xss')")).toBe(false);
    });

    it("rejects relative paths without leading slash", () => {
      expect(isValidNotificationLink("dm/123")).toBe(false);
      expect(isValidNotificationLink("../../../etc/passwd")).toBe(false);
    });

    it("rejects encoded protocol attacks", () => {
      expect(isValidNotificationLink("%2F%2Fevil.com")).toBe(false);
      expect(isValidNotificationLink("%6a%61%76%61%73%63%72%69%70%74%3a%61%6c%65%72%74%28%31%29")).toBe(false);
    });
  });

  // Edge cases
  describe("edge cases", () => {
    it("handles paths with query strings", () => {
      expect(isValidNotificationLink("/dm/123?tab=messages")).toBe(true);
      expect(isValidNotificationLink("/events?sort=date")).toBe(true);
    });

    it("handles paths with fragments", () => {
      expect(isValidNotificationLink("/dm/123#header")).toBe(true);
    });

    it("handles paths with special characters", () => {
      expect(isValidNotificationLink("/bookings/event-abc-123")).toBe(true);
      expect(isValidNotificationLink("/profile/user_name")).toBe(true);
    });
  });
});
