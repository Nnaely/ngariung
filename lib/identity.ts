/** Shared account policy for onboarding and local demo sessions. */
export const CAMPUS_EMAIL_DOMAIN = "ikamasu.ac.id";

export function normalizeCampusEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isCampusEmail(value: string): boolean {
  return /^[^@\s]+@ikamasu\.ac\.id$/i.test(normalizeCampusEmail(value));
}
