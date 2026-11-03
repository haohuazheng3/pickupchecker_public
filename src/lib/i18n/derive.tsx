/**
 * Regional forms derived from a language's dictionary: Swiss German writes "ss" where German writes "ß".
 * Walks the dictionary; strings are rewritten, functions wrapped (their strings and React text rewritten).
 */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

function mapNode(n: ReactNode, f: (s: string) => string): ReactNode {
  if (typeof n === "string") return f(n);
  if (Array.isArray(n)) return n.map((x) => mapNode(x, f));
  if (isValidElement(n)) {
    const el = n as ReactElement<{ children?: ReactNode; text?: string }>;
    const props: { children?: ReactNode; text?: string } = {};
    if (el.props.children !== undefined) props.children = Children.map(el.props.children, (c) => mapNode(c, f));
    if (typeof el.props.text === "string") props.text = f(el.props.text);
    return cloneElement(el, props);
  }
  // Builders return section objects ({ h2, lead, blocks }): rewrite their strings too.
  if (n && typeof n === "object" && Object.getPrototypeOf(n) === Object.prototype) return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, mapNode(v as ReactNode, f)])) as unknown as ReactNode;
  return n;
}

export function mapDict<T>(d: T, f: (s: string) => string): T {
  if (typeof d === "string") return f(d) as T;
  if (typeof d === "function") return ((...a: unknown[]) => mapNode((d as (...x: unknown[]) => ReactNode)(...a), f)) as T;
  if (Array.isArray(d)) return d.map((x) => mapDict(x, f)) as T;
  if (d && typeof d === "object" && !isValidElement(d)) return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, mapDict(v, f)])) as T;
  return d;
}
export const swiss = <T,>(d: T): T => mapDict(d, (s) => s.replace(/ß/g, "ss"));
