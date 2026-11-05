/**
 * Plain system email through Resend: the owner's ops mail and the one-off "notifications stopped" notice.
 * PickupChecker has NO email restock alerts — every restock alert is a push notification (see CLAUDE.md
 * 「提醒只有消息弹窗」). Do not add an alert email or an email fallback here.
 */
import { Resend } from "resend";
import { env } from "../env";

let _client: Resend | null = null;
function client(): Resend {
  if (_client) return _client;
  const key = env.resendKey();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  _client = new Resend(key);
  return _client;
}

export async function sendPlainEmail(to: string, subject: string, text: string): Promise<string> {
  return withRateLimitRetry(() => client().emails.send({ from: env.alertsFrom(), to, subject, text }));
}

type SendResult = { data: { id?: string } | null; error: { name: string; message: string } | null };

/**
 * Resend allows 10 requests per second for the whole account, shared by three hosts and the site
 * (on 11-05 14:00 UTC a burst of mail lost one message to `rate_limit_exceeded`). A rate-limited send was not delivered, so it is safe to
 * retry: wait (with jitter, so parallel senders spread out) and try again, up to ~4 s in all.
 * Any other error still throws at once (the caller records it).
 */
export async function withRateLimitRetry(
  send: () => Promise<SendResult>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  waits: readonly number[] = [400, 900, 1300, 1600],
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await send();
    if (!error) return data?.id ?? "";
    if (error.name !== "rate_limit_exceeded" || attempt >= waits.length) throw new Error(`${error.name}: ${error.message}`);
    await sleep(waits[attempt] + Math.floor(Math.random() * 300));
  }
}
