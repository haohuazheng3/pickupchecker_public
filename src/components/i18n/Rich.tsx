/**
 * A client-dictionary template: "{name}" placeholders filled with strings, numbers or React nodes, and **bold**
 * runs. Server and client.
 */
import { Fragment, type ReactNode } from "react";

export function Rich({ text, vars = {}, b = "font-semibold text-ink" }: { text: string; vars?: Record<string, ReactNode>; b?: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\{(\w+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<b key={k++} className={b}><Rich text={m[1]} vars={vars} b={b} /></b>);
    else out.push(<Fragment key={k++}>{m[2] in vars ? vars[m[2]] : m[0]}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
