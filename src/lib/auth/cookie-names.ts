/** Shared between middleware (edge) and server code — no server-only imports. */
export const ADMIN_COOKIE = "fr_admin";
export const VISITOR_COOKIE = "fr_visitor";
export const LEAD_COOKIE = "fr_lead";
/**
 * Non-sensitive browser hint used only to decide whether `/api/session` is
 * worth calling. Authentication still relies exclusively on LEAD_COOKIE.
 */
export const LEAD_HINT_COOKIE = "fr_identified";
