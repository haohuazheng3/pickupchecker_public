import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Post { slug: string; title: string; description: string; date: string; body: string }

const DIR = join(process.cwd(), "content", "blog");

/** Minimal Markdown posts: `---` front matter (title, description, date) + body paragraphs. */
export function allPosts(): Post[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => parse(f.replace(/\.md$/, ""), readFileSync(join(DIR, f), "utf8")))
    .filter((p): p is Post => Boolean(p))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function postBySlug(slug: string): Post | null {
  const file = join(DIR, `${slug}.md`);
  if (!/^[a-z0-9-]+$/.test(slug) || !existsSync(file)) return null;
  return parse(slug, readFileSync(file, "utf8"));
}

function parse(slug: string, raw: string): Post | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!m) return null;
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, ""); }
  if (!meta.title || !meta.date) return null;
  return { slug, title: meta.title, description: meta.description ?? "", date: meta.date, body: m[2].trim() };
}

/** Tiny Markdown → HTML (headings, paragraphs, lists, links, bold). Enough for a skeleton blog. */
export function renderMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = []; } };
  for (const block of md.split(/\n{2,}/)) {
    const lines = block.split("\n");
    if (lines.every((l) => /^[-*] /.test(l))) { list.push(...lines.map((l) => l.slice(2))); flush(); continue; }
    flush();
    const h = /^(#{1,3}) (.+)$/.exec(block);
    if (h) { out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); continue; }
    out.push(`<p>${inline(block.replace(/\n/g, " "))}</p>`);
  }
  flush();
  return out.join("\n");
}
