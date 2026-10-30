import type { Block } from "@/lib/content/types";
import type { ModelKey } from "@/lib/apple/catalog";
import type { Facts } from "@/lib/content/facts";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Inline } from "./Inline";
import { Figure } from "./Figure";
import { LiveWidget } from "./LiveWidget";

/** One content block (paragraph, list, table, photo, live widget, note, button), rendered inside .prose-site. */
export function BlockView({ b, facts, model }: { b: Block; facts: Facts; model?: ModelKey }) {
  switch (b.t) {
    case "p": return <p><Inline text={b.text} facts={facts} /></p>;
    case "h3": return <h3><Inline text={b.text} facts={facts} /></h3>;
    case "ul": return <ul>{b.items.map((i, k) => <li key={k}><Inline text={i} facts={facts} /></li>)}</ul>;
    case "ol": return <ol className="my-3 ml-5 list-decimal space-y-1">{b.items.map((i, k) => <li key={k}><Inline text={i} facts={facts} /></li>)}</ol>;
    case "note": return <div className={`my-4 rounded-2xl border px-4 py-3 text-sm ${b.tone === "warn" ? "border-[var(--warn)]/30 bg-[var(--warn)]/[0.07]" : "border-accent/25 bg-accent/[0.06]"}`}><Inline text={b.text} facts={facts} /></div>;
    case "img": return <Figure id={b.id} />;
    case "live": return <LiveWidget id={b.id} model={b.model ?? model} facts={facts} />;
    case "cta": return <div className="my-5 flex flex-wrap items-center gap-3"><Link href={b.href} className="btn btn-primary">{b.label}</Link>{b.sub && <span className="text-sm text-ink-3"><Inline text={b.sub} facts={facts} /></span>}</div>;
    case "table": return (
      <div className="my-5 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-sm">
          {b.caption && <caption className="mb-2 text-left text-xs text-ink-3"><Inline text={b.caption} facts={facts} /></caption>}
          <thead><tr>{b.head.map((h, k) => <th key={k} scope="col" className="border-b border-line-2 py-2 pr-3 text-left font-semibold text-ink"><Inline text={h} facts={facts} /></th>)}</tr></thead>
          <tbody>{b.rows.map((r, k) => <tr key={k} className="border-b border-line">{r.map((c, j) => j === 0 ? <th key={j} scope="row" className="py-2 pr-3 text-left font-medium text-ink"><Inline text={c} facts={facts} /></th> : <td key={j} className="py-2 pr-3 align-top"><Inline text={c} facts={facts} /></td>)}</tr>)}</tbody>
        </table>
        {b.source && <p className="mt-1.5 text-xs text-ink-3">Source: <Inline text={b.source} facts={facts} /></p>}
      </div>
    );
  }
}

