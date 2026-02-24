/**
 * Cookie and localStorage helpers skeleton — populated in Story 1.3+
 * Stores email for pre-fill behaviour (Story 1.4).
 */

const EMAIL_KEY = 'bmad_todo_email'

/** Persist email for pre-fill after logout (Story 1.4) */
export function saveEmail(email: string): void {
  localStorage.setItem(EMAIL_KEY, email)
}

/** Retrieve persisted email for pre-fill (Story 1.4) */
export function getSavedEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY)
}

/** Clear persisted email (Story 1.4) */
export function clearSavedEmail(): void {
  localStorage.removeItem(EMAIL_KEY)
}
