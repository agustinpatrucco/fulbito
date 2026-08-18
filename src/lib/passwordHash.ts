/**
 * A per-player password, meant to stop someone from picking a friend's card and
 * playing as them — not a real security boundary (this table is as openly readable
 * as everything else in the app, see README). Salted SHA-256 is plenty for that bar,
 * with no server round-trip needed to check it.
 */
export function randomSalt(): string {
  return crypto.randomUUID()
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
