import { env } from "../env";
import { sendPlainEmail } from "./resend";

/**
 * Owner notifications: Resend first (paid, 50k a month), the Cloudflare mail worker as the fallback, console as the
 * last resort. Until 2026-11-08 the worker went first, but it shares a Workers Free account whose 100k requests a
 * day ran out every evening (another project's collector used 122k), so watchdog, capacity and archive mails
 * silently failed from ~22:00 to 00:00 UTC. Hosts send the same way: infra/linode/owner-mail.sh.
 */
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<void> {
  if (env.resendKey() && env.ownerEmail()) {
    try {
      await sendPlainEmail(env.ownerEmail(), subject, text, replyTo);
      return;
    } catch (e) {
      console.warn("[owner-notify] Resend failed, trying the mail worker:", e instanceof Error ? e.message : String(e));
    }
  }
  const url = env.mailWorkerUrl();
  const token = env.mailWorkerToken();
  if (url && token) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/notify`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ subject, text, replyTo }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return;
    } catch {
      /* fall through */
    }
  }
  console.warn("[owner-notify] no channel delivered:", subject);
}
