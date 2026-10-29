import { env } from "../env";
import { sendPlainEmail } from "./resend";

/**
 * Owner notifications: the Cloudflare mail worker (free `send_email` binding to the verified
 * owner address) first, Resend as the fallback, console as the last resort.
 */
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<void> {
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
  if (env.resendKey() && env.ownerEmail()) {
    await sendPlainEmail(env.ownerEmail(), subject, text);
    return;
  }
  console.warn("[owner-notify] no channel configured:", subject);
}
