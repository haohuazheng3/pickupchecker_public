/**
 * A dictionary string with **bold** and [label](href) (internal links go through PendingLink, so they stay in the
 * reader's language). Server and client. `b` styles the bold runs ("font-semibold text-ink" like Inline by default).
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";

export function Md({ text, b = "font-semibold text-ink", a = "font-medium text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink", tag: Bold = "strong" }: { text: string; b?: string; a?: string; tag?: "strong" | "b" }) {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<Bold key={k++} className={b}>{m[1]}</Bold>);
    else if (m[3].startsWith("/") || m[3].startsWith("#")) out.push(<Link key={k++} href={m[3]} className={a}>{m[2]}</Link>);
    else out.push(<a key={k++} href={m[3]} target="_blank" rel="noopener" className={a}>{m[2]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
/** The same string as plain text (meta tags, aria labels, JSON-LD). */
export function mdPlain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1");
}
