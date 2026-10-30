/** PendingLink → NavSkeleton: a client-side navigation to `href` started (pending) or ended. */
export const NAV_EVENT = "pc:nav";
export interface NavEventDetail { href: string; pending: boolean }
