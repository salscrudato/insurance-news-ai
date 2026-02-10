/**
 * Admin Configuration
 *
 * Hardcoded allowlist of admin emails for MVP.
 * In production, consider using Firebase custom claims instead.
 */

/** List of email addresses with admin privileges */
export const ADMIN_EMAILS: readonly string[] = [
  "sal.scrudato@gmail.com",
] as const;

/**
 * Check if an email is in the admin allowlist
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

