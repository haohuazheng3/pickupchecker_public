/**
 * Lower-case, accent-free, punctuation-free words: what every search compares against. Letters of any script
 * stay (銀座, 가로수길, 台北), recomposed so kana keep their marks.
 */
export function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
