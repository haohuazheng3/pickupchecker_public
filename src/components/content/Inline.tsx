import { PendingLink as Link } from "@/components/ui/PendingLink";
import { fillTokens, type Facts } from "@/lib/content/facts";

/** **bold** and [label](href) after live tokens are filled. Internal links stay in the app; external ones open a new tab. */
export function Inline({ text, facts }: { text: string; facts: Facts }) {
  const s = fillTokens(text, facts);
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] != null) out.push(<strong key={k++} className="font-semibold text-ink">{m[1]}</strong>);
    else if (m[3].startsWith("/") || m[3].startsWith("#")) out.push(<Link key={k++} href={m[3]} className="font-medium text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink">{m[2]}</Link>);
    else out.push(<a key={k++} href={m[3]} target="_blank" rel="noopener" className="text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink">{m[2]}</a>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return <>{out}</>;
}

/** Plain text of an inline string (tokens filled, markup removed): for meta tags and JSON-LD. */
export function plainText(text: string, facts: Facts): string {
  return fillTokens(text, facts).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1");
}
