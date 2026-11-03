import type { Dict } from "../en";

/** 한국어 문구: common. */
export const common: Dict["common"] = {};

/* ---------------------------------------------------------------- 조사 도우미 (이 폴더의 다른 파일이 씀) */

/** 마지막 글자에 받침이 있는지(라틴 문자·숫자는 읽는 소리로 추정). `rieul`: 받침이 ㄹ인지. */
function tail(word: string): { batchim: boolean; rieul: boolean } {
  const w = word.replace(/[\s)\]』」"'’”.,·]+$/u, "");
  const ch = w[w.length - 1] ?? "";
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return { batchim: jong !== 0, rieul: jong === 8 };
  }
  // 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔: 받침 / 2 이, 4 사, 5 오, 9 구: 없음
  if (/[0-9]/.test(ch)) return { batchim: "013678".includes(ch), rieul: "178".includes(ch) };
  // 읽는 소리가 받침으로 끝나는 라틴 낱말: iPhone(아이폰), Apple(애플)
  if (/phone$/i.test(w)) return { batchim: true, rieul: false };
  if (/apple$/i.test(w)) return { batchim: true, rieul: true };
  // 라틴 문자: l(엘)·m(엠)·n(엔) 끝은 받침으로 읽힘(GB, Max, Pro, Duo, Plus 등은 받침 없음)
  if (/[a-z]/i.test(ch)) {
    const l = ch.toLowerCase();
    return { batchim: "lmn".includes(l), rieul: l === "l" };
  }
  return { batchim: false, rieul: false };
}
/** 이/가 */
export const iGa = (w: string) => `${w}${tail(w).batchim ? "이" : "가"}`;
/** 은/는 */
export const eunNeun = (w: string) => `${w}${tail(w).batchim ? "은" : "는"}`;
/** 을/를 */
export const eulReul = (w: string) => `${w}${tail(w).batchim ? "을" : "를"}`;
/** 과/와 */
export const gwaWa = (w: string) => `${w}${tail(w).batchim ? "과" : "와"}`;
/** (으)로: ㄹ 받침은 "로". */
export const euro = (w: string) => { const t = tail(w); return `${w}${t.batchim && !t.rieul ? "으로" : "로"}`; };
/** 이에요/예요 */
export const ieyo = (w: string) => `${w}${tail(w).batchim ? "이에요" : "예요"}`;

/**
 * fullAddress()가 만든 "강남구 가로수길 43, 서울 06028, 대한민국"을 한국식 순서 "서울 강남구 가로수길 43"으로.
 * 형태가 다르면 그대로 돌려줘요.
 */
export function krAddress(address: string): string {
  const m = address.match(/^(.+), (\S+) \d{5}(?:, [^,]+)?$/);
  if (!m) return address;
  const [, street, city] = m;
  return street.startsWith(city) ? street : `${city} ${street}`;
}
