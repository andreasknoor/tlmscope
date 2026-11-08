import type { Session } from "../model/types.ts";

/** A channel id, or a list of alternatives of which one is enough. */
export type Need = string | string[];

export type Result<T> =
  | { available: true; value: T }
  | { available: false; missing: Need[] };

/** The needs a session does not meet. */
export function missing(session: Session, needs: Need[]): Need[] {
  return needs.filter((n) => (Array.isArray(n) ? !n.some((id) => session.channels.has(id)) : !session.channels.has(n)));
}

/** Runs `fn` only if the session has all channels it needs. */
export function withNeeds<T>(session: Session, needs: Need[], fn: () => T | null): Result<T> {
  const m = missing(session, needs);
  if (m.length) return { available: false, missing: m };
  const value = fn();
  return value === null ? { available: false, missing: [] } : { available: true, value };
}

/** First of the alternatives that the session has. */
export const firstPresent = (session: Session, ids: string[]): string | undefined => ids.find((id) => session.channels.has(id));
