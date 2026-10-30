import type { Block } from "@/lib/content/types";
import type { ModelKey } from "@/lib/apple/catalog";
import type { Facts } from "@/lib/content/facts";
import { Inline } from "./Inline";
import { BlockView } from "./Blocks";

export interface KeywordSection { id: string; h2: string; lead: string; blocks: Block[] }

/** Sections whose H2 is a secondary keyword's entry title; each opens with a one-to-two sentence answer. */
export function KeywordSections({ sections, facts, model }: { sections: KeywordSection[]; facts: Facts; model?: ModelKey }) {
  if (sections.length === 0) return null;
  return (
    <div className="prose-site">
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-24">
          <h2>{s.h2}</h2>
          <p className="font-medium text-ink"><Inline text={s.lead} facts={facts} /></p>
          {s.blocks.map((b, k) => <BlockView key={k} b={b} facts={facts} model={model} />)}
        </section>
      ))}
    </div>
  );
}

export function slugId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
