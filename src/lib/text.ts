/** Lower-case, accent-free, punctuation-free words: what every search compares against. */
export function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
