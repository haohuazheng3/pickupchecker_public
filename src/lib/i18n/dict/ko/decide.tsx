/**
 * 한국어 문구: decide — 네 개의 결정 페이지(seo.md §16): 어떤 구성이 가장 구하기 쉬운지, 품귀가 풀리고 있는지,
 * Apple Store·통신사·리테일러 중 어디서 사야 하는지, 공개 API. 질문마다 답을 먼저 쓰는 문장 하나, 숫자는 전부
 * lib/content/duoDecide.ts(와 channels.ts)에서 와요. 구성·색상·매장 이름은 뷰가 이미 한국어로 넘겨 주고(x.cfg, x.colour,
 * x.storeName), 나라 이름은 places.countryLabel로 써요(한국 페이지에서는 views.tsx처럼 "국내").
 * 확인 주기는 15초(전체)와 5초(알림 매장)뿐이고, API 캐시 30초는 "간격"으로 써요. 모델 이름·용량·브랜드·URL은 번역하지 않아요.
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { SPEED } from "@/lib/plans";
import { fitTitleW, list, num } from "@/lib/i18n/format";
import { countryLabel } from "@/lib/i18n/places";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import { eulReul, eunNeun, gwaWa, iGa, ieyo } from "./common";

const L = "ko" as const;
const n = (x: number) => num(L, x);
const cn = (c: Country) => countryLabel(c.cc, L);
/** "국내"(한국) / 나라 이름(다른 나라) — views.tsx와 같은 규칙. */
const dom = (c: Country) => (c.cc === "kr" ? "국내" : cn(c));
/** "국내에서" / "일본에서". */
const at = (c: Country) => `${dom(c)}에서`;
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
const longDate = (ymd: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "11월 5일(목)". */
const dateLabel = (ymd: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`)).replace(" (", "(");
/** 판매 목록에 떠 있던 시간 "38.4시간", 1시간 미만은 "41분". */
const hours = (sec: number) => (sec >= 3600 ? `${n(exposureHours(sec))}시간` : `${n(Math.max(1, Math.round(sec / 60)))}분`);
/** 영어 원문과 같은 경계: 120초 미만은 초, 그 이상은 분. */
const secs = (s: number) => (s >= 120 ? `${n(Math.round(s / 60))}분` : `${n(Math.round(s))}초`);
const ratio = (a: number, b: number) => (b > 0 ? `${n(Math.round((a / b) * 10) / 10)}배` : "—");
/** 매장당 주간 재입고 "2.3". */
const perStore = (perStoreDay: number) => n(Math.round(perStoreDay * 70) / 10);

/** "국내 Apple Store 7곳 전체" / "싱가포르의 Apple Store 1곳". */
const storesPhrase = (x: DecideCtx) => (x.one ? `${cn(x.c)}의 Apple Store 1곳` : `${dom(x.c)} Apple Store ${n(x.stores)}곳 전체`);
/** 이번 주 재입고가 지난주보다: "많아요" / "적어요" / "비슷해요". */
const trendCmp = (d: DuoSupply) => (d.trend === "up" ? "많아요" : d.trend === "down" ? "적어요" : "비슷해요");
/** "Apple의 14일 반품·교환 기간", "Apple의 반품 불가 정책(불량 교환만 가능)"(홍콩), 또는 중립적인 표현. 환불이라는 말은 쓰지 않아요. */
const returnPhrase = (days: number | null) => (days ? `Apple의 ${n(days)}일 반품·교환 기간` : days === 0 ? "Apple의 반품 불가 정책(불량 교환만 가능)" : "Apple의 반품 정책");
/**
 * channels.ts의 carrierLock은 영어 문장이라 그대로 쓸 수 없어요. 한국은 그 데이터의 내용(Apple 자급제는 락 없음,
 * 통신사 판매분은 미확인)을 한국어로 쓰고, 다른 나라는 일반 안내로 대신해요.
 */
const lockNote = (x: ChannelsView) => (x.c.cc === "kr"
  ? "Apple에서 파는 자급제 iPhone은 통신사 락이 없어요. 통신사가 판 기기의 락 여부는 따로 확인하지 못했어요."
  : "구입 전에 통신사 락 여부와 요금제 조건을 확인하세요.");

/* ================================================================== 어떤 구성이 가장 구하기 쉬운가 */
const configs: DecideDict["configs"] = {
  crumb: "어떤 구성이 좋을까?",
  title: (c: Country) => fitTitleW([
    `${dom(c)} iPhone Duo, 가장 많이 재입고되는 구성은?`,
    `iPhone Duo 가장 많이 재입고되는 구성은?`,
    `iPhone Duo 가장 잘 풀리는 구성은?`,
  ], 49),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `${at(x.c)} 가장 오래 판매 노출된 iPhone Duo는 ${x.cfg(e)}: ${longDate(d.since)} 이후 Apple Store ${n(x.stores)}곳에서 확인된 재입고 ${n(d.n)}회 중 ${n(e.restocks)}회, 판매 노출 ${hours(e.exposureSec)}. 가장 짧은 건 ${x.cfg(h)}(${n(h.restocks)}회). 용량·색상별 전체 구성 순위, 재입고마다 갱신.`,
        `${at(x.c)} 가장 오래 판매 노출된 iPhone Duo는 ${x.cfg(e)}(${longDate(d.since)} 이후 재입고 ${n(d.n)}회 중 ${n(e.restocks)}회), 가장 짧은 건 ${x.cfg(h)}. 용량·색상별 전체 구성 순위.`,
        `${dom(x.c)} iPhone Duo 가장 오래 판매 노출된 구성: ${x.cfg(e)}(재입고 ${n(d.n)}회 중 ${n(e.restocks)}회). 용량·색상별 전체 순위.`,
      ], 160)
      : fitTitleW([
        `${longDate(d.since)} 이후 ${dom(x.c)} Apple Store에서 확인된 재입고로 매긴 iPhone Duo 전체 구성 순위: 용량, 색상, 판매 노출 시간, 지금 재고 있는 구성.`,
        `${dom(x.c)} Apple Store 확인된 재입고로 매긴 iPhone Duo 구성 순위: 용량, 색상, 노출 시간, 지금 재고.`,
      ], 160);
  },
  h1: (x: ConfigsView) => `${dom(x.c)} iPhone Duo, 어떤 구성이 가장 많이 재입고되고 가장 오래 재고가 남아 있을까요?`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker가 ${longDate(d.since)}부터 ${storesPhrase(x)}에서 확인한 iPhone Duo 재입고는 ${n(d.n)}회로, 아직 구성 순위를 매기기엔 적어요. 아래 표는 재입고마다 채워지고, 미국 페이지에는 이미 패턴이 나와 있어요.`;
    const st = d.byStorage, co = d.byColor;
    const last = st[st.length - 1];
    const sizePart = st.length > 1
      ? (last.restocks > 0
        ? `${st[0].key} 모델이 ${last.key}보다 ${ratio(st[0].restocks, last.restocks)} 자주 재입고됐`
        : `${st[0].key} 모델이 재입고의 ${pct(st[0].share)}를 차지한 반면 ${eunNeun(last.key)} 한 번도 재입고되지 않았`)
      : "";
    const colourPart = co.length > 1
      ? `고, 색상은 ${gwaWa(x.colour(co[0].key))} ${x.colour(co[1].key)}의 차이가 ${n(Math.abs(Math.round((co[0].share - co[1].share) * 100)))}포인트에 그쳤어요`
      : "어요";
    return `${at(x.c)} 판매 목록에 가장 오래 떠 있던 iPhone Duo 구성은 ${ieyo(x.cfg(e))}. PickupChecker가 ${longDate(d.since)}부터 ${storesPhrase(x)}에서 확인한 재입고 ${n(d.n)}회 중 ${n(e.restocks)}회가 이 구성이었고, 매장 ${n(e.stores)}곳에 들어왔으며, 판매 목록에 떠 있던 시간을 모두 더하면 ${hours(e.exposureSec)}${e.lifetimes ? `, 한 번 뜨면 중앙값 ${secs(e.lifetimes.medianSec)} 유지됐어요` : "예요"}. ${h ? `가장 짧았던 건 ${x.cfg(h)}: 재입고 ${n(h.restocks)}회, 판매 노출 ${hours(h.exposureSec)}.` : ""}${st.length > 1 ? ` 재입고 횟수는 색상보다 용량에 따라 더 크게 갈려요: ${sizePart}${colourPart}.` : ""} 실제로 어느 걸 살 수 있을지는 누구도 말할 수 없어요. 잴 수 있는 건 지난 픽업 기회이고, 이 페이지는 그걸 순서대로 보여 줘요.`;
  },
  updated: (x: ConfigsView, stamp: string) => `${stamp} 업데이트 · ${longDate(x.d.since)}부터의 데이터 · Apple Store ${n(x.stores)}곳 · ${SPEED.checkSec}초마다 확인(알림 매장은 ${SPEED.fastSec}초마다)`,
  nav: { easiest: "가장 오래 떠 있던 구성", storage: "용량", colour: "색상", shelf: "잡을 시간", week: "이번 주", alerts: "알림 걸 구성", method: "집계 방법" },
  h2: (x: ConfigsView) => ({
    easiest: `${at(x.c)} 판매 목록에 가장 오래 떠 있던 iPhone Duo 구성은?`,
    storage: "용량에 따라 재입고 빈도가 달라지나요?",
    colour: `${x.d.byColor.length > 1 ? `${gwaWa(x.colour(x.d.byColor[0].key))} ${x.colour(x.d.byColor[1].key)} 중 ` : ""}어느 색상이 더 자주 재입고되나요?`,
    shelf: "어떤 구성이 잡을 시간을 가장 많이 주나요?",
    week: "최근 7일 동안 무엇이 달라졌나요?",
    alerts: "어떤 구성에 알림을 걸어야 하나요?",
    method: "재입고와 판매 유지 시간은 어떻게 세나요?",
  }),
  hero: {
    restocks: (label: string) => `${label} 확인된 재입고`,
    exposure: "판매 목록에 떠 있던 시간, 전 매장 합산",
    // 영어 원문이 문자열 리터럴 타입이라 한국어 문장으로 단언해요.
    now: ((one: boolean): string => (one ? "지금 재고 있음" : "지금 재고 있는 매장")) as DecideDict["configs"]["hero"]["now"],
    median: "한 번 뜨면 유지된 시간, 중앙값",
    total: "전체 구성 재입고 합계",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `${iGa(x.cfg(e))} 잴 수 있는 두 가지 모두에서 앞서요: 가장 자주 돌아왔고(재입고 ${n(e.restocks)}회, 전체의 ${pct(e.restocks / x.d.n)}), 판매 목록에 떠 있던 시간 합계도 가장 길어요(${hours(e.exposureSec)}). 이 시간이 픽업을 예약할 수 있었던 시간이에요. ${e.nowStores > 0 ? `지금 이 글을 읽는 순간 매장 ${n(e.nowStores)}곳에 재고가 있어요.` : "지금 이 순간 재고가 있는 매장은 없어요. 다음 재입고는 몇 초 안에 여기 표시돼요."}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `판매 노출 시간 기준 상위 3개: ${list(L, top3.map((r) => `${x.cfg(r)}(${hours(r.exposureSec)})`))}.`,
      d.never.length ? `${longDate(d.since)} 이후 ${at(x.c)} 한 번도 재입고되지 않은 구성: ${list(L, d.never.map((r) => x.cfg(r)))}.` : `${longDate(d.since)} 이후 모든 구성이 적어도 한 번은 재입고됐어요.`,
      d.lifetimes ? `전체 구성을 합치면 재입고는 중앙값 ${secs(d.lifetimes.medianSec)} 동안 떠 있었고, ${pct(d.lifetimes.within2min)}는 2분 안에 사라졌어요.` : "판매 유지 시간은 끝난 시점이 확인된 재입고가 10회 쌓이면 표시돼요.",
    ];
  },
  rankCaption: (x: ConfigsView) => `${dom(x.c)} iPhone Duo 전체 구성, 판매 노출 시간이 긴 순 · ${longDate(x.d.since)}부터 오늘까지`,
  rankHead: ["구성", "재입고", "매장", "노출 합계", "유지 중앙값", "지금 재고", "마지막 재입고"],
  none: "아직 없음",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "용량 비교는 재입고가 쌓이면 표시돼요. 아래 표는 실시간이에요.";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `네, 다른 어떤 요인보다 커요: ${iGa(st[0].key)} 재입고의 ${pct(st[0].share)}, ${iGa(st[1].key)} ${pct(st[1].share)}를 차지했${big ? `고, 1TB와 2TB 모델을 합쳐도 ${pct(big / x.d.n)}에 그쳤어요` : "어요"}. Apple은 사람들이 가장 많이 주문하는 용량을 많이 보내고, 상위 용량은 한 번 배송에 매장이 여러 대씩 받는 용량이기도 해요.`;
  },
  groupCaption: (what: "storage" | "colour") => `${what === "storage" ? "용량" : "색상"}별 재입고, 전 매장 합산`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "용량" : "색상", "재입고", "비율", "매장", "노출 합계", "유지 중앙값", "지금 재고"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `${last}에만 알림`, yes: `${top} 먼저, ${last}도 함께`, why: `${eunNeun(last)} 재입고의 ${pct(st[st.length - 1].share)}, ${eunNeun(top)} ${pct(st[0].share)}였어요. 알림은 각각 한 자리씩만 써요.` },
      { no: "원하는 용량만 기다리기", yes: `${top}, ${second} 중 먼저 뜨는 걸 잡기`, why: `두 용량이 ${at(x.c)} 전체 재입고의 ${pct(st[0].share + st[1].share)}를 차지했어요. 케이스와 iCloud를 생각하면 용량 차이는 기다림보다 작아요.` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "색상 비교는 재입고가 쌓이면 표시돼요.";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, 하지만 차이는 크지 않아요: 재입고의 ${pct(co[0].share)} 대 ${x.colour(co[1].key)} ${pct(co[1].share)}, ${n(gap)}포인트 차이예요${co[0].medianSec && co[1].medianSec ? `. 판매 유지 중앙값은 각각 ${secs(co[0].medianSec)}와 ${secs(co[1].medianSec)}였어요` : ""}. 색상은 용량보다 재입고 횟수를 덜 바꿔요. 두 번째 색상도 지켜보면 그 색상의 픽업 기회가 더해져요: ${co[1].restocks > 0 ? `${longDate(x.d.since)}부터 ${at(x.c)} ${eunNeun(x.colour(co[1].key))} 재입고 ${n(co[1].restocks)}회, 노출 ${hours(co[1].exposureSec)}을 더했어요. ${x.colour(co[0].key)}의 ${n(co[0].restocks)}회, ${hours(co[0].exposureSec)}에 더해서요(전 용량 합계)` : `${longDate(x.d.since)}부터 ${at(x.c)} ${eunNeun(x.colour(co[1].key))} 재입고가 없어서 지금까지는 더해진 게 없어요`}.`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}: 매장 ${n(g.stores)}곳에서 재입고 ${n(g.restocks)}회, 판매 노출 합계 ${hours(g.exposureSec)}${g.nowStores ? `, 지금 ${n(g.nowStores)}곳에 재고` : ""}.`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "재입고의 판매 유지 시간은 재입고부터 다음 품절 확인까지로 측정해요. 한 구성의 재입고가 10회 끝나면 첫 수치가 나와요.";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${iGa(x.cfg(slow))} 시간을 가장 많이 줘요: 품절 전까지 중앙값 ${secs(slow.lifetimes!.medianSec)} 떠 있었고, ${eunNeun(x.cfg(fast))} ${secs(fast.lifetimes!.medianSec)}였어요. 느리게 팔리는 건 비싼 용량이에요. 원하는 사람이 적으니까요. 그래서 ‘잡을 시간이 가장 많은 구성’과 ‘가장 많이 재입고되는 구성’은 서로 다르고, 위 순위는 둘을 함께 따져요.`;
  },
  shelfCaption: "구성별 판매 유지 시간(재입고 → 다음 품절 확인)",
  shelfHead: ["구성", "끝난 시점이 확인된 재입고", "중앙값", "2분 내 품절", "20분 내 품절", "가장 빠른 품절"],
  shelfKeys: (x: ConfigsView) => [
    `재입고의 절반은 ${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "1분 안팎"} 안에 사라졌어요. 알림은 재입고를 확인하고 약 ${SPEED.alertSec}초 뒤에 발송되고, 남은 시간 안에 살 수 있을지는 휴대폰과 미리 준비해 둔 결제에 달려 있어요.`,
    `이 시간은 상한값이에요. 품절은 다음 확인에서 보이는데, 최대 ${SPEED.checkSec}초(알림 매장은 ${SPEED.fastSec}초) 뒤예요.`,
    "여기서 ‘품절’은 Apple 픽업 페이지가 그 매장에서 그 구성을 더 이상 표시하지 않았다는 뜻이에요. 몇 대였는지는 Apple이 밝히지 않아요.",
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `최근 14일 동안 ${at(x.c)} 재입고가 없었어요. 주간 비교표는 다음 재입고부터 시작돼요.`;
    const lead = rows[0];
    return `최근 7일 재입고 ${n(tot7)}회${totP ? `, 그 전 7일은 ${n(totP)}회(${signed(tot7 / totP - 1)})` : ""}. 가장 많은 건 ${x.cfg(lead)} ${n(lead.last7)}회예요. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `전체 기간 1위(${x.cfg(x.d.easiest)})와는 다른 구성이에요. 배송마다 조합이 바뀌니, 알림 걸 구성을 고르기 전에 이 표를 확인하세요.` : "전체 기간 1위가 이번 주에도 1위예요."}`;
  },
  weekCaption: "구성별 재입고: 최근 7일 vs 그 전 7일",
  weekHead: ["구성", "최근 7일", "그 전 7일", "변화"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `가장 빨리 갈 수 있는 매장 두세 곳에 ${list(L, top.map((r) => x.cfg(r)))} 알림을 걸어 두세요. 지금까지 ${at(x.c)} 확인된 재입고의 ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)}가 여기에 들어가요. 정확히 원하는 구성은 네 번째 알림으로 추가하고, 먼저 뜨는 걸 잡으세요.`
      : `${at(x.c)} 재입고가 쌓이기 전까지는, 가장 가까운 매장에 원하는 용량의 두 색상 모두 알림을 걸어 두세요.`;
  },
  alertsKeys: (x: ConfigsView) => [
    "알림은 매장 × 구성 단위라, 매장 3곳 × 구성 3개면 알림 9개예요.",
    `알림 매장은 ${SPEED.fastSec}초마다 확인하고, 재입고를 한 번 더 확인한 뒤 푸시해요. 푸시는 약 ${SPEED.alertSec}초 뒤에 발송되고, 휴대폰에 배너가 뜨는 시점은 기기와 네트워크에 따라 달라 저희가 측정하지 않아요.`,
    `${x.one ? "" : "매장은 재입고 횟수가 아니라 거리로 고르세요: "}가장 바쁜 매장은 지켜보는 사람도 가장 많은 매장이에요.`,
  ],
  methodLead: "재입고는 한 매장에서 어떤 구성이 품절에서 재고 있음으로 바뀌는 것이고, 일치하는 두 번의 확인으로 확정해요. 추적 공백 뒤에 처음 보인 건 세지 않아요. 판매 유지 시간은 재입고부터 다시 품절로 보이는 첫 확인까지라 상한값이에요. ‘노출 합계’는 그 구성의 모든 재입고에 걸쳐 이 시간을 더한 값으로, 픽업을 예약할 수 있었던 시간을 보여 주는 가장 단순한 척도예요. 지난 노출의 기록일 뿐, 구매 확률도 판매 대수도 아니에요. Apple은 둘 다 공개하지 않아요.",
  methodKeys: (x: ConfigsView) => [
    `출처: ${storesPhrase(x)}의 Apple 자체 픽업 재고 정보. ${longDate(x.d.since)}부터 매장마다 ${SPEED.checkSec}초마다(알림 매장은 ${SPEED.fastSec}초마다) 읽어요.`,
    "지금 재고 있는 매장과 마지막 재입고 시각은 실시간이고, 나머지는 5분 안에 다시 계산돼요.",
    "링크를 달아 자유롭게 인용하세요. 수치는 바뀌니 읽은 날짜를 함께 적어 주세요.",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `${at(x.c)} 가장 구하기 쉬운 iPhone Duo는 무엇인가요?`, a: e ? `어떤 걸 사게 될지는 누구도 말할 수 없어요. Apple은 배정 물량도, 몇 명이 노리는지도 공개하지 않거든요. 잴 수 있는 건 지난 픽업 가능 구간이에요. ${longDate(d.since)} 이후 ${storesPhrase(x)}에서 확인된 재입고 ${n(d.n)}회 가운데 판매 노출 합계는 ${iGa(x.cfg(e))} 가장 길었고(재입고 ${n(e.restocks)}회, ${n(e.stores)}곳, 합계 ${hours(e.exposureSec)})${h ? ` ${iGa(x.cfg(h))} 가장 짧았어요(재입고 ${n(h.restocks)}회, 합계 ${hours(h.exposureSec)}).` : ", 다른 구성은 그보다 짧았어요."} 지난 노출 기록일 뿐, 살 수 있을지에 대한 예측은 아니에요. 색상이나 매장을 하나 더하면 구간이 얼마나 늘어나는지는 알림 설정의 ‘픽업 가능 구간을 가장 많이 늘리는 선택은?’에서 볼 수 있어요.` : `${at(x.c)} 확인된 재입고가 아직 너무 적어 말할 수 없어요. 재입고가 들어오는 대로 이 페이지가 모든 구성의 순위를 매겨요.` },
      { q: co.length > 1 ? `${iGa(x.colour(co[1].key))} ${x.colour(co[0].key)}보다 구하기 어렵나요?` : "한 색상이 다른 색상보다 구하기 어렵나요?", a: co.length > 1 && d.n ? `조금요: ${iGa(x.colour(co[0].key))} 재입고의 ${pct(co[0].share)}, ${iGa(x.colour(co[1].key))} ${pct(co[1].share)}였어요. 용량 간 차이가 훨씬 크니, 용량을 먼저 정하고 그 용량의 두 색상 모두에 알림을 걸어 두세요.` : "색상 비교는 재입고가 쌓이면 표시돼요." },
      { q: `${at(x.c)} 1TB나 2TB iPhone Duo 재고가 뜨기도 하나요?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); const most = big.length ? Math.max(...big.map((r) => r.stores)) : 0; return bn ? `네, 하지만 드물어요: 전체 ${n(d.n)}회 중 1TB·2TB 모델 재입고는 ${n(bn)}회(${pct(bn / d.n)}), 많아야 매장 ${n(most)}곳에서였어요. 한 번 뜨면 더 오래 남아 있어서(원하는 사람이 적어요) 드물게 울려도 알림 한 자리를 쓸 가치가 있어요.` : `아직 저희 데이터에는 없어요: ${longDate(d.since)} 이후 ${at(x.c)} 1TB·2TB 모델의 확인된 재입고가 없어요.`; })() },
      { q: "알림은 한 구성에만 걸까요, 여러 구성에 걸까요?", a: `여러 구성, 적은 매장에요: 상위 3개 구성이 ${at(x.c)} 재입고의 ${d.n ? pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "대부분"}을 차지했어요. 가까운 매장 3곳 × 구성 3개면 알림 9개로 Plus 요금제에 들어가고, 정확히 원하는 구성은 네 번째로 추가하세요.` },
      { q: "다른 나라도 구성 비율이 같나요?", a: `항상 같지는 않아요: 나라마다 배정 물량이 따로 있어서 그 나라 페이지의 순위는 다를 수 있어요. ‘다른 나라’ 아래 링크로 PickupChecker가 추적하는 나머지 18개국의 같은 페이지를 열 수 있고, 기록이 가장 긴 건 미국 페이지(${longDate("2026-10-29")}부터)예요.` },
    ];
  },
  sources: { apple: "Apple: iPhone Duo 구성과 가격", pickup: "Apple: 매장 픽업", log: "PickupChecker: 이 페이지의 계산에 쓴 재입고 기록" },
  ld: (x: ConfigsView) => ({
    datasetName: `${dom(x.c)} Apple Store iPhone Duo 구성별 재입고`,
    description: `${longDate(x.d.since)} 이후 ${storesPhrase(x)}에서 확인된 iPhone Duo 재입고를 구성(용량 × 색상)별로: 횟수, 매장, 판매 노출 합계, 판매 유지 중앙값, 지금 재고 있는 매장.`,
    measured: ["구성별 재입고", "재입고가 있었던 매장", "판매 노출 시간(초)", "판매 유지 시간 중앙값", "지금 재고 있는 매장"],
  }),
  related: "이어서 읽기",
  sameData: "같은 데이터, 다른 질문",
  otherCountries: "다른 나라",
  questions: { restockTimes: "Apple은 iPhone Duo를 언제 재입고하나요?", sellOut: "재입고는 얼마나 빨리 품절되나요?", shortage: "품귀는 풀리고 있나요?", channels: "Apple, 통신사, 아니면 리테일러?", alerts: "가장 빨리 알림 받는 법", api: "무료 재고 API" },
  setUpAlert: "알림 설정하기",
  logLive: "실시간 재입고 기록",
  faqTitle: "자주 묻는 질문",
  onThisPage: "이 페이지 목차",
};

/* ================================================================== 품귀는 풀리고 있나 */
const supply: DecideDict["supply"] = {
  crumb: "품귀는 풀리고 있을까?",
  title: (c: Country) => fitTitleW([
    `${dom(c)} iPhone Duo 품귀, 풀리고 있을까? 주간 추이`,
    `iPhone Duo 품귀, 풀리고 있을까? 주간 추이`,
    `iPhone Duo 품귀는 풀리고 있을까?`,
  ], 49),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `이번 주 ${at(x.c)} iPhone Duo 재입고는 지난주보다 ${trendCmp(d)}: 7일 동안 Apple Store ${n(w.stores)}곳에서 ${n(w.restocks)}회(전주 대비 ${signed(d.change!)})${w.medianSec ? `, 각각 중앙값 ${secs(w.medianSec)} 만에 품절` : ""}. 날짜별 물량, ‘풀린다’는 게 어떤 모습인지, 기다릴지 말지.`,
        `최근 7일 ${at(x.c)} iPhone Duo 재입고 ${n(w.restocks)}회(전주 대비 ${signed(d.change!)}). 날짜별 물량과 품귀가 풀리고 있는지.`,
      ], 160)
      : fitTitleW([
        `${at(x.c)} iPhone Duo 품귀는 풀리고 있을까요? ${longDate(d.since)} 이후 확인된 Apple Store 재입고 ${n(d.n)}회를 날짜별로, 풀린다는 게 어떤 모습인지, 기다릴지 지금 살지까지.`,
        `${dom(x.c)} iPhone Duo 품귀: ${longDate(d.since)} 이후 확인된 Apple Store 재입고 ${n(d.n)}회를 날짜별로, 기다릴지 지금 살지까지.`,
      ], 160);
  },
  h1: (x: SupplyView) => `${dom(x.c)} iPhone Duo 품귀, 나아지고 있나요? 얼마나 더 갈까요?`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `${at(x.c)} 아직 판단하기 일러요: PickupChecker는 ${longDate(d.since)}, 즉 ${n(d.days)}일 전에 추적을 시작해서 첫 주간 비교는 ${longDate(d.comparableFrom)}에 나와요. 지금까지 Apple Store ${n(x.stores)}곳 중 ${n(d.storesEver)}곳에서 확인된 재입고 ${n(d.n)}회${d.lifetimes ? `, 각각 품절 전까지 중앙값 ${secs(d.lifetimes.medianSec)} 유지` : ""}, 지금 이 순간 Duo 재고가 있는 매장은 ${n(d.storesNow)}곳이에요. 품귀가 언제 끝날지는 누구도 예측할 수 없어요. 이 페이지는 그걸 가장 먼저 말해 줄 두 숫자, 주간 재입고 횟수와 판매 유지 초를 재입고마다 갱신해 보여 줘요.`;
    }
    const verdict = d.trend === "up" ? "물량이 늘고 있어요" : d.trend === "down" ? "물량이 줄고 있어요" : "물량은 제자리예요";
    const demand = w.medianSec
      ? (w.medianSec <= 120
        ? `하지만 수요가 여전히 다 삼켜요: 이번 주 재입고는 중앙값 ${secs(w.medianSec)} 만에 사라졌고${d.prev7.medianSec ? `(지난주 ${secs(d.prev7.medianSec)})` : ""}, 그래서 직접 새로고침해서 사기는 아직 더 쉬워지지 않았어요`
        : `그리고 판매 유지 시간이 길어지고 있어요: 이번 주 중앙값 ${secs(w.medianSec)}${d.prev7.medianSec ? `, 지난주는 ${secs(d.prev7.medianSec)}` : ""}로, 풀리기 시작했다는 첫 신호예요`)
      : "";
    return `${at(x.c)} ${verdict}: 최근 7일 동안 Apple Store의 iPhone Duo 재입고는 ${n(w.restocks)}회로 그 전 주(${n(d.prev7.restocks)}회) 대비 ${signed(d.change!)}, 매장 ${n(x.stores)}곳 중 ${n(w.stores)}곳에 들어왔어요${demand ? `. ${demand}` : ""}. 지금 이 순간 재고가 있는 매장은 ${n(d.storesNow)}곳이에요. 끝을 예측할 수 있는 사람은 없어요. 가장 먼저 그걸 말해 줄 두 숫자가 이 페이지에 있고, 재입고마다 갱신돼요.`;
  },
  updated: (x: SupplyView, stamp: string) => `${stamp} 업데이트 · ${longDate(x.d.since)}부터의 데이터 · Apple Store ${n(x.stores)}곳 · ${SPEED.checkSec}초마다 확인`,
  nav: { trend: "이번 주", easier: "사기 쉬워졌나", stores: "몇 매장에", howlong: "얼마나 더", christmas: "기다릴까 살까", world: "다른 나라", method: "집계 방법" },
  h2: (x: SupplyView) => ({
    trend: `${at(x.c)} iPhone Duo 재입고는 늘고 있나요, 줄고 있나요?`,
    easier: "실제로 사기는 쉬워지고 있나요?",
    stores: `${dom(x.c)} Apple Store 중 iPhone Duo가 한 번이라도 들어온 곳은 몇 곳인가요?`,
    howlong: "iPhone Duo 품귀는 얼마나 더 갈까요?",
    christmas: "재입고를 계속 기다릴까요, 다른 방법으로 살까요?",
    world: x.us ? "다른 나라에서는 품귀가 더 빨리 풀리고 있나요?" : `${dom(x.c)}보다 품귀가 더 빨리 풀리는 나라가 있나요?`,
    method: "집계 방법",
  }),
  weekBefore: "그 전 주",
  goneIn2: "2분 안에 품절",
  storesEverLabel: ((one: boolean): string => (one ? "지금까지 확인된 재입고" : "재입고가 1회 이상 있었던 매장")) as DecideDict["supply"]["storesEverLabel"],
  hero: {
    last7: "최근 7일 재입고",
    change: "그 전 7일 대비",
    stores: ((one: boolean): string => (one ? "재입고가 있었던 날" : "최근 7일 재입고된 매장")) as DecideDict["supply"]["hero"]["stores"],
    median: "최근 7일 판매 유지 중앙값",
    now: ((one: boolean): string => (one ? "지금 재고 있음" : "지금 재고 있는 매장")) as DecideDict["supply"]["hero"]["now"],
    sinceLast: "마지막 재입고 후 지난 시간",
  },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `지금까지의 기록 전부가 아래 날짜별 표예요: ${n(d.days)}일 동안 재입고 ${n(d.n)}회. 주간 비교는 ${longDate(d.comparableFrom)}에 나오고, 그때까지는 날짜별로 방향을 읽으세요.`;
    const w = d.last7, p = d.prev7;
    return `이번 주는 지난주보다 ${trendCmp(d)}: 재입고 ${n(w.restocks)}회(매장당 ${perStore(w.perStoreDay)}회), 그 전 주 ${n(p.restocks)}회, ${signed(d.change!)}. ${w.longestGapHours != null ? `이번 주 재입고 사이 가장 긴 공백은 ${n(w.longestGapHours)}시간${p.longestGapHours != null ? `(지난주 ${n(p.longestGapHours)}시간)` : ""}이었어요. ` : ""}재입고는 배송에 맞춰 파도처럼 오기 때문에 하루 조용했다고 해서 의미는 거의 없어요. 봐야 할 건 7일 합계예요.`;
  },
  dailyCaption: (x: SupplyView) => `${dom(x.c)} 날짜별(매장 현지 날짜) 확인된 재입고, 최신순(최근 14일)`,
  dailyHead: ["날짜", "재입고", "매장", "유지 중앙값"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `지금까지 가장 많았던 날: ${dateLabel(best.date)}, 매장 ${n(best.stores)}곳에서 재입고 ${n(best.restocks)}회.` : "아직 재입고가 없어요. 가장 많았던 날이 여기에 표시돼요.",
      x.d.sinceLastHours != null && x.d.latest ? `마지막 재입고는 ${x.d.sinceLastHours < 1 ? "1시간이 안 됐어요" : `${n(x.d.sinceLastHours)}시간 전이에요`}: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "아직 기록된 재입고가 없어요.",
      `‘늘었다’는 그 전 주보다 재입고가 ${Math.round(0.15 * 100)}% 이상 많다는 뜻, ‘줄었다’는 ${Math.round(0.15 * 100)}% 이상 적다는 뜻이고, 그 사이는 ‘비슷하다’로 읽어요.`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "‘쉬워진다’는 두 가지가 동시에 일어나는 거예요: 재입고가 늘고, 각각이 더 오래 떠 있는 것. 판매 유지 시간은 이 기간에 끝난 시점이 확인된 재입고가 10회 쌓이면 표시돼요.";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "조금은요, 네" : shorter ? "아니요, 오히려 반대예요" : "아직이에요"}: 이번 주 재입고는 중앙값 ${secs(w.medianSec)} 떠 있었고${p.medianSec ? `(지난주 ${secs(p.medianSec)})` : ""}, ${pct(w.within2min!)}는 2분 안에 사라졌어요${p.within2min != null ? `(지난주 ${pct(p.within2min)})` : ""}. 풀린다는 건 두 숫자가 함께 움직이는 모습이에요. 재입고가 늘고 유지 시간도 길어지는 것. 재입고만 늘면 Apple이 더 많이 보내는데 기다리는 사람도 그만큼 많다는 뜻이에요.`;
  },
  easierKeys: (x: SupplyView) => [
    "여기서 ‘풀렸다’는 이런 모습일 거예요: 판매 유지 중앙값 20분 초과, 대부분 매장에 동시에 재고, apple.com 배송 예정이 일주일 이내.",
    `그때까지 사는 방법은 여전히 알림이에요. 재입고를 확인하고 약 ${SPEED.alertSec}초 뒤에 푸시를 발송하니, 유지 중앙값 안에 충분히 들어와요.`,
    x.d.lifetimes ? `${dom(x.c)} 전체 기간: 끝난 시점이 확인된 재입고 ${n(x.d.lifetimes.n)}회, 중앙값 ${secs(x.d.lifetimes.medianSec)}, ${pct(x.d.lifetimes.within2min)}는 2분 안에 품절.` : "전체 기간 판매 유지 수치는 끝난 재입고 10회 뒤에 표시돼요.",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `네: ${cn(x.c)}의 유일한 Apple Store에 ${longDate(d.since)} 이후 확인된 재입고가 ${n(d.n)}회 있었어요` : `아직이에요: ${longDate(d.since)} 이후 ${cn(x.c)}의 유일한 Apple Store에 확인된 재입고가 없어요`}${d.storesNow ? ". 지금은 Duo 재고가 있어요" : ""}.`
      : `${dom(x.c)} Apple Store ${n(x.stores)}곳 중 ${n(d.storesEver)}곳(${pct(d.storesEver / x.stores)})에 ${longDate(d.since)} 이후 확인된 iPhone Duo 재입고가 한 번 이상 있었어요${never ? `. ${n(never)}곳은 아직 없어요` : ""}. 지금 이 순간 재고가 있는 곳은 ${n(d.storesNow)}곳이에요. 물량은 고르게 퍼지지 않아요. 플래그십과 쇼핑몰 매장이 가장 많이 재입고되니, 알림을 걸 매장 선택이 구성 선택만큼 중요해요.`;
  },
  storesKeys: (x: SupplyView) => [
    `매장별 재입고 횟수와 현지 시각: ${dom(x.c)} 재입고 시간 페이지의 ‘어디서’ 섹션.`,
    "한 번도 재입고되지 않은 매장이 Apple이 건너뛰는 매장은 아니에요. 물량은 배송 단위로 오고, 여러 매장이 둘째 주에야 첫 Duo를 받았어요.",
  ],
  howlongLead: (x: SupplyView) => `Apple 바깥에선 아무도 모르고, 저희도 예측하지 않아요. 기록이 보여 주는 ${dom(x.c)} 상황: ${n(x.d.days)}일 동안 재입고 ${n(x.d.n)}회, ${x.d.trend === "insufficient" ? `주간 추이는 ${longDate(x.d.comparableFrom)}부터` : `이번 주 재입고는 지난주보다 ${trendCmp(x.d)}`}, 판매 유지 시간은 ${x.d.last7.medianSec ? `${secs(x.d.last7.medianSec)} 안팎` : "몇 분 이내"}. 품귀는 여기서 지켜볼 수 있는 순서로 끝나요: 주간 재입고가 늘고, 유지 시간이 초에서 시간 단위로 늘어나고, 그다음 대부분 매장에 동시에 재고가 생기며 apple.com 배송 예정이 며칠로 줄어요.`,
  howlongKeys: () => [
    "신호 1: 주간 재입고가 2~3주 연속 늘어난다(위 표).",
    "신호 2: 판매 유지 중앙값이 20분을 넘는다. 새로고침하는 사람보다 재입고가 오래 남는다는 뜻.",
    "신호 3: apple.com 배송 예정이 일주일 이내로 들어오고, 대부분 매장에 동시에 재고가 생긴다.",
    "새 색상이나 용량 출시는 시계를 되돌려요. 신호 3까지는 알림을 켜 두세요.",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `알림을 켜 두고, apple.com 배송 주문도 넣어 두세요. 둘 중 하나가 아니라 둘 다요. 지금 속도(${perDay >= 1 ? `${at(x.c)} 하루 약 ${n(Math.round(perDay))}회 재입고` : `${at(x.c)} 하루 1회 미만 재입고`}${w.medianSec ? `, 각각 중앙값 ${secs(w.medianSec)} 유지` : ""})면 가까운 매장에 걸어 둔 알림은 며칠 안에 차례가 오고, 확인된 재입고 알림은 저희가 본 뒤 약 ${SPEED.alertSec}초 만에 발송돼요. 다른 곳에서 웃돈을 주는 건 기다림 자체가 웃돈보다 더 비쌀 때만 말이 돼요. 판매 채널 비교 페이지가 그걸 솔직하게 따져요.`;
  },
  christmasKeys: () => [
    "먼저 apple.com에서 배송으로 주문하세요. 자리를 잡아 두고, 픽업이 되면 취소할 수 있어요.",
    "가까운 매장에 가장 많이 재입고되는 구성 두세 개로 알림(어떤 구성인지는 구성 페이지에).",
    "Apple Store 앱에 로그인해 Duo를 장바구니에 넣고 카드를 저장해 두세요. 판매 유지 중앙값은 1분 안팎이에요.",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "나라마다 매장당 주간 재입고를 비교하는 표는 각국의 데이터가 일주일 치 쌓이면 여기에 나와요.";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `최근 7일 매장당 재입고는 ${iGa(top.name)} 가장 많았고(매장당 ${perStore(top.perStoreDay)}회), ${iGa(bottom.name)} 가장 적었어요(${perStore(bottom.perStoreDay)}회)${mine ? `. ${eunNeun(dom(x.c))} ${perStore(mine.perStoreDay)}회예요` : ""}. 배정 물량은 나라와 출시일마다 달라서 풀리는 속도도 고르지 않아요. 기록이 가장 긴 건 미국이에요.`;
  },
  worldCaption: "나라별 최근 7일: 재입고, 매장당 재입고, 판매 유지 중앙값, 지금 재고 있는 매장",
  worldHead: ["나라", "매장", "재입고(7일)", "매장당", "유지 중앙값", "지금 재고"],
  methodLead: `재입고는 한 매장에서 어떤 구성이 품절에서 재고 있음으로 바뀌는 것이고, ${SPEED.checkSec}초 간격(알림 매장은 ${SPEED.fastSec}초)의 일치하는 두 번의 확인으로 확정해요. 추적 공백 뒤 처음 보인 건 세지 않아요. 날짜는 매장 현지 날짜예요. 판매 유지 시간은 재입고부터 다시 품절로 보이는 첫 확인까지로, 다음 확인까지의 상한값이에요. 주간 비교는 최근 7일(현지 날짜)과 그 전 7일을 비교하며, 둘 다 완전해야 비교해요.`,
  methodKeys: (x: SupplyView) => [
    `출처: ${storesPhrase(x)}의 Apple 픽업 재고 정보, ${longDate(x.d.since)}부터.`,
    "이 페이지의 모든 수치는 재입고 뒤 5분 안에 다시 계산되고, 지금 재고 있는 매장은 실시간이에요.",
    "링크와 날짜를 함께 인용해 주세요. 움직이는 숫자예요.",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `${at(x.c)} iPhone Duo는 아직 재입고되고 있나요?`, a: d.n ? `네: 최근 7일 동안 ${dom(x.c)} Apple Store ${n(w.stores)}곳에서 확인된 재입고 ${n(w.restocks)}회, ${longDate(d.since)} 이후로는 ${n(d.n)}회예요. 마지막 재입고는 ${d.sinceLastHours != null && d.sinceLastHours < 1 ? "1시간이 안 됐어요" : d.sinceLastHours != null ? `${n(d.sinceLastHours)}시간 전이에요` : "아직 기록되지 않았어요"}.` : `${longDate(d.since)}에 추적을 시작한 뒤 ${at(x.c)} 아직 확인된 재입고가 없어요. 첫 재입고 뒤 5분 안에 이 페이지가 갱신돼요.` },
      { q: `${at(x.c)} iPhone Duo 품귀는 나아지고 있나요?`, a: d.trend === "insufficient" ? `아직 말하기 일러요: 첫 주간 비교는 ${longDate(d.comparableFrom)}에 나와요. 두 숫자를 지켜보세요. 주간 재입고 횟수와 판매 유지 초, 둘 다 올라야 풀리는 거예요.` : `이번 주 재입고는 지난주보다 ${trendCmp(d)}(${signed(d.change!)})${w.medianSec ? `, 재입고는 중앙값 ${secs(w.medianSec)} 유지됐어요` : ""}. 풀린다는 건 재입고가 늘고 유지 시간도 함께 길어지는 것인데, 지금까지는 ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "둘 다 좋은 방향으로 움직이고 있어요" : "그중 일부만 일어나고 있어요"}.` },
      { q: "iPhone Duo는 언제쯤 쉽게 살 수 있을까요?", a: "Apple 바깥에선 아무도 말할 수 없고, PickupChecker도 예측하지 않아요. 지켜볼 순서: 주간 재입고가 2~3주 늘고, 판매 유지 중앙값이 20분을 넘고, 그다음 대부분 매장에 동시에 재고가 생기며 apple.com 배송 예정이 일주일 이내로 들어와요." },
      { q: "기다리는 대신 웃돈을 주고 사야 할까요?", a: `기다림이 웃돈보다 비쌀 때만요: 지금 속도면 가까운 매장에 걸어 둔 알림은 며칠 안에 차례가 오고, 확인된 재입고 뒤 약 ${SPEED.alertSec}초면 알림이 발송돼요. 리셀은 반품 기간도 없고 흔한 위험도 따라와요. 판매 채널 비교 페이지가 그걸 따져요.` },
      { q: "연말 시즌에는 확률이 달라지나요?", a: "12월로 갈수록 수요는 늘고 배송 리듬은 그대로여서, 판매 유지 시간은 길어지기보다 짧아지는 편이에요. 배송 주문을 안전장치로 두고 알림으로 픽업을 잡으세요. 필요 없게 된 쪽은 취소하면 돼요." },
    ];
  },
  sources: { newsroom: "Apple Newsroom: iPhone Duo, 전 세계 Apple Store 출시", pickup: "Apple: 매장 픽업", log: "PickupChecker: 이 페이지의 계산에 쓴 재입고 기록", restockTimes: "PickupChecker: Apple은 iPhone Duo를 언제 재입고하나" },
  ld: (x: SupplyView) => ({
    datasetName: `${dom(x.c)} Apple Store iPhone Duo 물량 추이`,
    description: `${longDate(x.d.since)} 이후 ${storesPhrase(x)}에서 날짜별로 확인된 iPhone Duo 재입고: 횟수, 매장, 판매 유지 중앙값, 전주 대비 변화.`,
    measured: ["날짜별 재입고", "재입고가 있었던 매장", "판매 유지 시간 중앙값", "전주 대비 변화", "지금 재고 있는 매장"],
  }),
  related: "이어서 읽기",
  sameData: "같은 데이터, 다른 질문",
  otherCountries: "다른 나라의 같은 페이지",
  questions: { restockTimes: "Apple은 iPhone Duo를 언제 재입고하나요?", configs: "가장 많이 재입고되는 구성은?", channels: "Apple, 통신사, 아니면 리테일러?", sellOut: "재입고는 얼마나 빨리 품절되나요?", howToGet: "iPhone Duo 구하는 법", alerts: "가장 빨리 알림 받는 법" },
  setUpAlert: "알림 설정하기",
  logLive: "실시간 재입고 기록",
  faqTitle: "자주 묻는 질문",
  onThisPage: "이 페이지 목차",
};

/* ================================================================== Apple vs 통신사 vs 리테일러 */
const channels: DecideDict["channels"] = {
  crumb: "Apple, 통신사, 리테일러?",
  title: (c: Country, retailer: string) => fitTitleW([
    `${dom(c)} iPhone Duo: Apple Store, 통신사, ${retailer}?`,
    `iPhone Duo: Apple Store, 통신사, ${retailer}?`,
    `iPhone Duo: Apple, 통신사, ${retailer}?`,
    `iPhone Duo: Apple, 통신사, 리테일러?`,
  ], 49),
  metaDescription: (x: ChannelsView) => fitTitleW([
    `${at(x.c)} iPhone Duo를 실제로 구하는 곳: Apple Store 픽업(${longDate(x.sup.since)} 이후 매장 ${n(x.stores)}곳에서 확인된 재입고 ${n(x.sup.n)}회), apple.com 배송, ${list(L, x.ch.carriers.slice(0, 3))}, ${list(L, x.ch.retailers.slice(0, 2))}, 리셀. 채널마다 알 수 있는 것과 없는 것, 어디를 지켜볼지.`,
    `${at(x.c)} iPhone Duo: Apple Store 픽업 vs apple.com 배송 vs ${list(L, x.ch.carriers.slice(0, 2))} vs ${x.ch.retailers[0] ?? "리테일러"} vs 리셀. 채널마다 알 수 있는 것과 어디를 지켜볼지.`,
    `${dom(x.c)} iPhone Duo: Apple Store 픽업, apple.com 배송, 통신사, 리테일러, 리셀 비교. 어디를 지켜볼지.`,
  ], 160),
  h1: (x: ChannelsView) => `Apple Store, 통신사, 리테일러: ${at(x.c)} iPhone Duo를 실제로 어디서 구하나요?`,
  intro: (x: ChannelsView) => `${at(x.c)} 물량을 누구나 측정할 수 있는 iPhone Duo 판매 채널은 Apple Store 픽업 하나뿐이에요: PickupChecker는 ${longDate(x.sup.since)}부터 ${storesPhrase(x)}에서 재입고 ${n(x.sup.n)}회를 확인했고, 그중 ${n(x.sup.last7.restocks)}회가 최근 7일이며, 전부 Apple 픽업 페이지를 ${SPEED.checkSec}초마다 직접 읽은 결과예요. 통신사(${list(L, x.ch.carriers)})와 리테일러(${list(L, x.ch.retailers)})는 각자 물량을 따로 받고 재고 피드를 공개하지 않아서, 저희든 누구든 그들의 재입고 시간을 정직하게 말해 줄 수 없어요. 아래에 채널마다 알 수 있는 것과 없는 것, 장단점, 지켜볼 순서를 정리했어요.`,
  updated: (x: ChannelsView, stamp: string) => `${stamp} 업데이트 · Apple Store 데이터는 ${longDate(x.sup.since)}부터 · Apple Store ${n(x.stores)}곳 · ${SPEED.checkSec}초마다 확인`,
  nav: { compare: "채널별 비교", pickup: "픽업 vs 배송", carriers: "통신사", retailers: "리테일러", resale: "리셀 웃돈", abroad: "해외 구매", method: "근거" },
  h2: (x: ChannelsView) => ({
    compare: `${at(x.c)} iPhone Duo가 가장 자주 재입고되는 채널은?`,
    pickup: "Apple Store 픽업이 apple.com 배송 주문보다 빠른가요?",
    carriers: `${x.ch.carriers.length ? list(L, x.ch.carriers.slice(0, 3), 3) : "통신사"}에서 사는 게 나을까요?`,
    retailers: `${x.ch.retailers.length ? list(L, x.ch.retailers.slice(0, 2), 2) : "리테일러"}도 확인할 가치가 있나요?`,
    resale: `${x.ch.resale[0] ?? "리셀 사이트"}에서 웃돈을 주고 살 가치가 있나요?`,
    abroad: "해외에서 iPhone Duo를 사서 돌아와 쓸 수 있나요?",
    method: "저희가 아는 것을 어떻게 아나요",
  }),
  hero: {
    restocks: "확인된 Apple Store 재입고",
    last7: "최근 7일",
    now: ((one: boolean): string => (one ? "Apple Store에 지금 재고" : "지금 재고 있는 Apple Store")) as DecideDict["channels"]["hero"]["now"],
    channels: "공개 재고 피드가 없는 다른 채널",
  },
  compareLead: (x: ChannelsView) => `Apple Store 픽업이에요, 측정할 수 있는 유일한 기준으로는: 최근 7일 ${at(x.c)} 매장 ${n(x.sup.last7.stores)}곳에서 확인된 재입고 ${n(x.sup.last7.restocks)}회${x.sup.last7.medianSec ? `, 각각 중앙값 ${secs(x.sup.last7.medianSec)} 유지` : ""}. 통신사와 리테일러도 거의 틀림없이 재입고돼요. 같은 Apple 출하분에서 물량을 받으니까요. 하지만 상품 페이지에 있다/없다만 보여 주고 피드는 없어서, 아래 비교는 누가 더 많이 받느냐가 아니라 무엇을 지켜볼 수 있느냐에 관한 거예요.`,
  compareCaption: "iPhone Duo 판매 채널, 솔직한 비교",
  compareHead: ["채널", "재고에 대해 알 수 있는 것", "지켜보는 방법", "함정"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "Apple Store 픽업", known: `${longDate(x.sup.since)} 이후 확인된 재입고 ${n(x.sup.n)}회. 모든 재입고, 모든 매장, 시각까지.`, watch: `여기 알림(확인 뒤 약 ${SPEED.alertSec}초에 발송), 또는 Apple Store 앱의 픽업 선택 화면.`, catch: "재고는 1분 안팎만 떠 있어요. 앱을 열어 두고 카드를 저장해 둬야 해요." },
      { channel: "apple.com 배송", known: "Apple이 결제 화면에 배송 예정을 보여 줘요. 매일 바뀌고, 재고 수량은 아니에요.", watch: "주문을 넣어 두세요. 주문 페이지의 예정일이 Apple 출하에 맞춰 갱신돼요.", catch: "분이 아니라 주 단위예요. 대신 줄의 자리는 지켜져요." },
      { channel: `통신사(${list(L, r.carriers)})`, known: "자체 물량. 온라인 재고는 구성별로 구매 가능/입고 대기로 표시돼요. 기록도 피드도 없어요.", watch: "통신사 앱과 매장 찾기. 매장에 전화해 보는 것도 여전히 통해요.", catch: `요금제·할부·개통 조건이 붙고, 재고는 매장마다 달라요. ${lockNote(x)}` },
      { channel: `리테일러(${list(L, r.retailers)})`, known: "자체 물량, 출시 초기엔 온라인 전용인 경우가 많아요. 상품 페이지에 구성별로 표시돼요.", watch: "상품 페이지와 앱. 재입고 알림 메일을 보내 주는 곳도 몇 군데 있어요.", catch: "물량이 Apple보다 적고, 역시 몇 분 안에 품절돼요." },
      { channel: `리셀(${list(L, r.resale)})`, known: "값만 맞으면 언제나 있어요.", watch: "—", catch: `웃돈, 제조사 구매 기록 없음, ${r.returnDays ? `${returnPhrase(r.returnDays)}도 없음` : "반품 기간도 전혀 없음"}.` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${at(x.c)} 다른 판매처 ${n(x.ch.carriers.length + x.ch.retailers.length)}곳 중 공개된 재고 기록이 있는 곳은 하나도 없어요. 통신사 재입고 시간을 안다고 주장하는 사이트는 추측하는 거예요.`,
    "저희 입장: Apple Store 픽업은 알림으로 지켜보고, apple.com 배송 주문은 안전장치로 두고, 리테일러 페이지는 이미 거기 있을 때 확인하세요.",
  ],
  pickupLead: (x: ChannelsView) => `속도는 픽업이에요: 픽업 페이지에 뜬 구성은 그 순간 예약해 같은 날 받을 수 있지만, 배송 주문은 Apple의 예정일을 기다려요. 확실함은 배송이에요: 매장 재고가 어떻게 되든 주문이 자리를 지켜요. ${x.sup.lifetimes ? `${dom(x.c)} 픽업 재고는 중앙값 ${secs(x.sup.lifetimes.medianSec)} 떠 있었고 ${pct(x.sup.lifetimes.within2min)}는 2분 안에 사라졌어요. 알림이 존재하는 이유예요. ` : ""}정답은 둘 다예요: 오늘 배송으로 주문하고, 픽업 알림을 걸고, 필요 없게 된 쪽을 취소하세요.`,
  pickupSwaps: () => [
    { no: "‘새로 시작’하려고 배송 주문 취소", yes: "픽업 기기를 손에 넣을 때까지 유지", why: "Apple은 대기 순번을 공개하지 않아요. 새 주문은 그냥 오늘의 예정일을 받는데, 지금 가진 것보다 이른 경우는 드물어요." },
    { no: "픽업 페이지를 직접 새로고침", yes: "알림에 맡기기", why: `알림 매장은 ${SPEED.fastSec}초마다 확인하고 재입고 확인 뒤 약 ${SPEED.alertSec}초에 푸시해요. 사람이 새로고침하면 대부분 사라진 뒤에 봐요.` },
    { no: "나중에 결제 단계에서 주문을 픽업으로 변경", yes: "알림이 울리면 픽업을 새 주문으로 예약", why: "픽업 예약은 매장 재고에서, 배송 주문은 창고에서 나와요. 서로 다른 두 줄이고, 빠른 쪽은 픽업이에요." },
  ],
  pickupKeys: (x: ChannelsView) => [
    `Apple 페이지에 픽업과 배송 옵션${x.ch.returnDays ? `과 둘 모두에 적용되는 ${n(x.ch.returnDays)}일 반품·교환 기간` : ""}이 설명돼 있어요(아래 출처).${x.ch.returnDays === 0 ? " 홍콩 Apple은 단순 변심 반품을 받지 않고 불량 교환만 해 준다는 점에 주의하세요." : ""}`,
    "픽업 예약은 그 매장에 대한 주문이에요. Apple이 보관해 두고 언제 오면 되는지 알려 줘요.",
  ],
  carriersLead: (x: ChannelsView) => `할부나 요금제에 묶인 트레이드인을 원하거나, 이미 ${x.ch.carriers[0] ?? "통신사"} 매장에 있는데 진열대에 기기가 있다면, 네. 가장 빨리 손에 넣고 싶다면, 통신사는 확률이 더 낮고 지켜볼 방법도 없는 두 번째 추첨이에요. ${lockNote(x)} 온라인 매장에 구성별 재고가 표시되니 한 번 보는 데 비용은 없어요. 다만 기록이나 알림은 기대하지 마세요.`,
  carriersKeys: (x: ChannelsView) => [
    `${dom(x.c)} 통신사: ${list(L, x.ch.carriers)}.`,
    "통신사 재고는 매장 단위예요. 온라인에 있다고 뜬 매장도 방문 수령만 가능할 수 있어요.",
    "통신사 폰도 같은 하드웨어예요. 차이는 거기 붙은 약정이에요.",
  ],
  retailersLead: (x: ChannelsView) => `이미 거기서 쇼핑 중이라면 한 번 볼 가치는 있지만, 지켜볼 가치는 없어요: ${eunNeun(list(L, x.ch.retailers))} iPhone Duo를 구성별로 올리고 자기 물량을 온라인에서 몇 분 안에 팔아 버리며, 구독할 피드도 없어요. 장점은 결제 조건과 포인트, 단점은 Apple 직영 매장보다 적은 물량이에요.`,
  retailersKeys: (x: ChannelsView) => [
    `${dom(x.c)} 리테일러: ${list(L, x.ch.retailers)}.`,
    "상품 페이지의 구성 선택기를 보세요. 회색 처리는 온라인 품절이란 뜻이고, 오프라인 매장 사정은 말해 주지 않아요.",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `거의 없어요. 웃돈과 그걸로 아끼는 기다림을 저울질해 보세요: 이번 주 ${dom(x.c)} Apple Store는 ${perDay >= 1 ? `하루 약 ${n(Math.round(perDay))}회` : "하루 1회 미만"} 재입고됐고, 확인된 재입고 뒤 약 ${SPEED.alertSec}초면 알림이 발송되니, 가까운 매장에 걸어 둔 알림은 보통 며칠 안에 차례가 와요. 반면 ${list(L, x.ch.resale)}에는 제조사 구매 기록이 없고, ${x.ch.returnDays ? `${returnPhrase(x.ch.returnDays)}도 없고` : "반품 기간도 전혀 없고"}, 흔한 위험도 따라와요. 활성화 잠금이 걸린 기기, 바꿔 넣은 박스, ‘미개봉’이라는 반품품.`;
  },
  resaleKeys: () => [
    "그래도 리셀로 산다면: 직접 만나서, 전원을 켜고, 설정 → 일반 → 정보에서 일련번호를 확인하고, 돈을 내기 전에 로그인해 보세요.",
    "Apple 보증은 영수증이 아니라 기기를 따라가요. 다만 구매 증명을 요구받을 수 있고, 개인 거래는 Apple의 구매 증명을 줄 수 없어요.",
    "일주일 기다림보다 큰 웃돈은 조급함에 내는 값이에요. 그걸 알고 결정하세요.",
  ],
  abroadLead: (x: ChannelsView) => `대부분 가능하지만 확인할 게 있어요: Apple에서 산 iPhone은 대부분 나라에서 언락 상태로 팔리고, Apple 보증 서비스는 예외를 두고 국제적으로 제공되며, 모델이 집에서 쓰는 통신사의 주파수 대역을 지원해야 해요. eSIM도요. Apple 구매 페이지는 모든 나라에서 iPhone Duo를 eSIM 전용으로 안내해요. 진짜 비용은 세금이에요: ${x.c.pricesIncludeTax ? "해외에서 내는 가격에는 돌려받지 못할 수도 있는 현지 세금이 들어 있고" : "판매세가 계산대에서 더해지고"}, 돌아올 때 세관에서 관세가 붙을 수 있어요. PickupChecker는 ${x.us ? "다른 18개국" : "미국과 다른 17개국"}을 추적하니, 재고 자체는 각 나라 페이지에서 확인할 수 있어요.`,
  abroadKeys: () => [
    "구입 전: 서비스 제공 지역이 적힌 Apple 보증 페이지, 모델의 주파수 대역·SIM 목록, 내 통신사의 eSIM 지원.",
    "영수증을 보관하세요. 서비스와 반품은 구입한 나라의 규정을 따라요.",
    "가족을 위해 사 가는 폰도 해외에서 산 폰이에요. 같은 확인이 필요해요.",
  ],
  methodLead: (x: ChannelsView) => `이 페이지의 Apple Store 수치는 PickupChecker가 ${longDate(x.sup.since)}부터 ${eulReul(storesPhrase(x))} ${SPEED.checkSec}초마다 직접 확인한 결과이고, 재입고는 일치하는 두 번의 관찰 뒤에만 세요. 통신사·리테일러 목록은 Apple이 그 나라에서 직접 이름을 올린 판매처와 가장 큰 리셀러들로, 각자의 페이지를 출처로 삼았어요. 그들의 재고에 대해 저희가 말하는 건 그들 페이지가 보여 주는 것, 즉 기록이 아니라 한순간의 스냅숏이에요. 저희는 그 사이트를 스크래핑하지 않고, 그들의 재입고 시간에 대해 어떤 주장도 하지 않아요.`,
  methodKeys: () => ["수정 환영: 이 페이지의 판매처가 더는 iPhone Duo를 팔지 않으면 알려 주세요. 바로 내릴게요.", "링크와 날짜를 함께 인용해 주세요."],
  faq: (x: ChannelsView): Faq[] => [
    { q: `${at(x.c)} iPhone Duo가 가장 빨리 재입고되는 채널은 어디인가요?`, a: `측정 가능한 기록이 있는 유일한 채널은 Apple Store 픽업이에요: 최근 7일 ${at(x.c)} 확인된 재입고 ${n(x.sup.last7.restocks)}회${x.sup.last7.medianSec ? `, 각각 중앙값 ${secs(x.sup.last7.medianSec)} 유지` : ""}. 통신사와 리테일러도 재입고되지만 피드를 공개하지 않아서, 누구도 정직하게 순위를 매길 수 없어요.` },
    { q: "apple.com 주문을 취소하고 다시 주문하면 자리를 잃나요?", a: "오늘의 배송 예정일이 붙은 새 주문을 받게 돼요. Apple은 대기 순번을 공개하지 않아요. 취소 전에 결제 화면의 예정일과 지금 주문의 예정일을 비교해 보세요. 더 이른 경우는 드물어요." },
    { q: "통신사 iPhone Duo는 Apple 것과 다른가요?", a: `같은 하드웨어예요. ${lockNote(x)} 통신사 재고는 Apple과 별개이고 매장별로 표시돼요.` },
    { q: "리테일러에서 사면 Apple의 반품 기간이 적용되나요?", a: x.ch.returnDays ? `아니요, 리테일러 자체 정책이 적용돼요. Apple의 ${n(x.ch.returnDays)}일 반품·교환 기간은 Apple(apple.com과 Apple Store)에서 산 경우에만 해당해요.` : x.ch.returnDays === 0 ? "홍콩 Apple은 자체적으로도 단순 변심 반품을 받지 않아요(불량 교환만). 그러니 리테일러 자체 정책을 비교해 보세요. 거기선 Apple보다 너그러운 곳도 있어요." : "아니요, 리테일러 자체 정책이 적용돼요. Apple의 반품 기간은 Apple에서 산 경우에만 해당해요." },
    { q: "Apple이 iPhone Duo 판매처로 올린 통신사는 어디인가요?", a: x.c.cc === "us" || x.c.cc === "jp" ? `${dom(x.c)} Apple 구매 페이지에는 ${iGa(list(L, x.ch.carriers))} 올라 있어요. 다른 나라 페이지는 통신사 선택 없이 언락 상태로 팔아요.` : `${dom(x.c)} Apple 구매 페이지는 iPhone Duo를 통신사 없이 언락(자급제)으로 팔아요. ${eunNeun(list(L, x.ch.carriers))} Apple이 ${at(x.c)} iPhone을 지원한다고 올린 통신사이고, 각자의 조건으로 판매해요.` },
    { q: "해외에서 산 iPhone Duo를 집에서 쓰는 통신사에서 쓸 수 있나요?", a: "대부분 가능해요. 모델이 내 통신사의 주파수 대역을 지원하고, 통신사가 eSIM을 제공하고(iPhone Duo는 어디서나 eSIM 전용), 기기가 언락이면요. Apple에서 직접 산 기기는 대부분 나라에서 언락이에요. 보증 서비스는 예외를 두고 국제적으로 제공되고, 세금과 관세가 진짜 추가 비용이에요." },
  ],
  sources: { buy: "Apple: iPhone Duo 구입하기", pickup: "Apple: 매장 픽업과 배송", returns: "Apple: 반품과 반품 기간", warranty: "Apple: 나라별 보증 서비스", log: "PickupChecker: 이 페이지의 계산에 쓴 재입고 기록" },
  ld: (x: ChannelsView) => ({
    description: `${at(x.c)} iPhone Duo: Apple Store 픽업 vs apple.com 배송 vs 통신사 vs 리테일러 vs 리셀. 측정된 Apple Store 재입고와, 다른 채널이 알려 줄 수 있는 것과 없는 것.`,
  }),
  related: "이어서 읽기",
  sameData: "같은 데이터, 다른 질문",
  otherCountries: "다른 나라의 같은 페이지",
  questions: { howToGet: "iPhone Duo 구하는 법", whereToBuy: "오늘 살 수 있는 곳", shortage: "품귀는 풀리고 있나요?", configs: "가장 많이 재입고되는 구성은?", restockTimes: "Apple은 iPhone Duo를 언제 재입고하나요?", alerts: "가장 빨리 알림 받는 법" },
  setUpAlert: "알림 설정하기",
  logLive: "실시간 재입고 기록",
  faqTitle: "자주 묻는 질문",
  onThisPage: "이 페이지 목차",
};

/* ================================================================== 공개 API */
const api: DecideDict["api"] = {
  crumb: "재고 API",
  title: (c: Country) => fitTitleW([
    `${dom(c)} iPhone Duo 재고 API: Apple Store 실시간 JSON`,
    `iPhone Duo 재고 API: Apple Store 실시간 데이터`,
    `${dom(c)} iPhone Duo 재고 API(무료 JSON)`,
    `iPhone Duo 재고 API(무료)`,
  ], 49),
  metaDescription: (x: ApiView) => fitTitleW([
    `${dom(x.c)} Apple Store ${n(x.stores)}곳(${n(x.countries)}개국 ${n(x.worldStores)}곳)의 iPhone Duo 픽업 재고를 주는 무료 읽기 전용 JSON API: 매장·구성별 현재 재고, 최근 24시간 확인된 재입고, 키 없음, 30초 캐시. 엔드포인트, curl/Python/JavaScript 예제, 제한, 스크립트가 알림보다 나은 경우.`,
    `${dom(x.c)} Apple Store ${n(x.stores)}곳의 iPhone Duo 재고 무료 JSON API: 매장별 재고, 최근 24시간 재입고, 키 없음. 엔드포인트, 예제, 제한.`,
  ], 160),
  h1: (x: ApiView) => `${dom(x.c)} Apple Store의 iPhone Duo 재고를 모니터링하는 API나 스크립트가 있나요?`,
  intro: (x: ApiView) => `네: PickupChecker는 ${eulReul(storesPhrase(x))} 다루는 무료 읽기 전용 JSON API를 공개해요(전체로는 ${n(x.countries)}개국 매장 ${n(x.worldStores)}곳). 매장마다 ${SPEED.checkSec}초마다 확인한 데이터로 만들고 엣지에서 30초 캐시하며, 키도 가입도 필요 없어요. 요청 한 번으로 모든 매장의 iPhone Duo 구성별 현재 픽업 재고를, 또 한 번으로 최근 24시간 확인된 재입고를 받아요. 지금 ${dom(x.c)} 매장 ${n(x.stores)}곳 중 ${n(x.storesNow)}곳에 재고가 있고, 최근 24시간 확인된 재입고는 ${n(x.restocks24)}회예요. 아래에 엔드포인트, curl·Python·JavaScript 동작 예제, 필드 설명, 제한을 정리했어요. 그리고 30초 캐시 간격으로 폴링하는 스크립트가 왜 푸시 알림보다 여전히 느린지도요.`,
  updated: (x: ApiView, stamp: string) => `${stamp} 업데이트 · ${dom(x.c)} Apple Store ${n(x.stores)}곳 · ${SPEED.checkSec}초마다 확인 · API 30초 캐시`,
  nav: { endpoints: "엔드포인트", examples: "예제", fields: "필드", limits: "제한과 조건", script: "스크립트냐 알림이냐", apple: "apple.com 직접 폴링", method: "데이터 출처" },
  h2: (x: ApiView) => ({
    endpoints: `${dom(x.c)} iPhone Duo 재고 API는 무엇을 돌려주나요?`,
    examples: "curl, Python, JavaScript에서 어떻게 호출하나요?",
    fields: "필드는 각각 무슨 뜻인가요?",
    limits: "얼마나 자주 폴링할 수 있고, 이용 조건은 무엇인가요?",
    script: "직접 스크립트를 짤까요, 그냥 알림을 쓸까요?",
    apple: "apple.com을 직접 폴링하면 안 되나요?",
    method: "데이터는 어디서 오나요",
  }),
  hero: {
    stores: ((one: boolean): string => (one ? "다루는 Apple Store" : "다루는 Apple Store")) as DecideDict["api"]["hero"]["stores"],
    now: "지금 iPhone Duo 재고 있음",
    restocks24: "최근 24시간 확인된 재입고",
    cache: "API 응답 캐시",
  },
  perMinute: "주소당 분당 요청 수",
  keysNeeded: "필요한 API 키",
  endpointsLead: (x: ApiView) => `GET 엔드포인트 세 개, 전부 JSON, 전부 https://pickupchecker.com/api/v1 아래에 있어요: \`stock\`은 ${dom(x.c)} 모든 Apple Store와 지금 픽업 가능한 구성, 마지막 확인 시각을, \`restocks\`는 최근 1~168시간의 확인된 재입고를 최신순으로 각각 아직 재고가 있는지와 함께, \`iphone-duo\`는 \`stock?model=duo\`의 단축 경로예요. 나라 코드는 경로에 들어가고(${x.c.cc}${x.c.cc === "uk" ? ", gb도 허용" : ""}), 모델은 duo, 18-pro, 18-pro-max예요.`,
  endpointsCaption: "엔드포인트({country}는 us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at, be 중 하나)",
  endpointsHead: ["엔드포인트", "돌려주는 것", "매개변수"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "모든 매장: in_stock, 재고 있는 구성, last_checked_at, last_in_stock_at. 요약에 stores_in_stock.", params: "model(duo | 18-pro | 18-pro-max), storage(예: 512GB), color(예: night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "확인된 재입고 최신순: at, store, 구성, still_listed.", params: "model, hours(1~168, 기본 24), limit(1~200, 기본 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "stock?model=duo로 리디렉션.", params: "—" },
    { path: "/api/v1", returns: "이 목록, 나라와 모델, 제한.", params: "—" },
  ],
  examplesLead: "아래 중 하나를 복사하세요. 각각 지금 iPhone Duo 재고가 있는 매장을 출력해요. 키는 없고, 헤더는 스크립트 이름을 담은 User-Agent 하나만요(문제가 생기면 저희가 연락할 수 있게).",
  exampleTitles: { curl: "curl(아무 셸)", python: "Python 3, 표준 라이브러리만", node: "JavaScript(Node 18 이상 또는 브라우저)" },
  fieldsLead: "모든 필드는 snake_case이고 모든 시각은 ISO 8601 UTC예요. 매장 식별자는 Apple 자체 번호(R-번호)라 Apple 매장 페이지와 이 사이트의 URL과 일치해요.",
  fieldsCaption: "필드 설명",
  fieldsHead: ["필드", "타입", "뜻"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "이 응답을 계산한 시각. CDN이 최대 30초까지 같은 응답을 줄 수 있어요." },
    { f: "country.code / name / currency", t: "string", m: "매장이 있는 나라." },
    { f: "configurations[]", t: "object", m: "질의가 다루는 부품 번호와 Apple 표기 그대로의 storage, color." },
    { f: "summary.stores_in_stock", t: "integer", m: "다루는 구성 중 하나 이상이 지금 픽업 가능한 매장 수." },
    { f: "stores[].store_number", t: "string", m: "Apple 매장 ID, 예: R085." },
    { f: "stores[].in_stock", t: "boolean", m: "다루는 구성 중 하나 이상이 픽업 가능으로 표시됨." },
    { f: "stores[].available[]", t: "object", m: "재고 있는 구성: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `이 매장의 Apple 픽업 페이지를 마지막으로 읽은 시각(보통 ${SPEED.checkSec}초 이내).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "이 매장에 다루는 구성이 마지막으로 재고 있었던 시각." },
    { f: "restocks[].at", t: "string", m: "구성이 품절에서 재고 있음으로 바뀐 시각(두 번 확인으로 확정)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "응답 시점에 그 매장에 아직 재고가 있는지." },
    { f: "attribution", t: "object", m: "출처, 라이선스 문구, 이 페이지." },
  ],
  limitsLead: "엔드포인트마다 30초 이상의 간격으로 폴링하세요. 응답은 엣지에서 그만큼 캐시되니 더 짧은 간격은 같은 JSON만 돌려줘요. 그리고 주소 하나에서 분당 60회 미만으로 유지하세요. 그게 저희 서버에 닿는 한도예요. 데이터는 상업적 이용을 포함해 무료로 쓸 수 있고, 조건은 하나예요: 숫자가 보이는 곳마다 ‘출처: PickupChecker’와 pickupchecker.com(또는 매장·나라 페이지) 링크를 표시하세요. 키 없음, 가입 없음, CORS 열림이라 브라우저 페이지에서 바로 호출할 수 있어요.",
  limitsKeys: () => [
    "429 응답은 한 주소에서 1분에 60회를 넘었다는 뜻이에요. Retry-After에 적힌 초만큼 기다리세요.",
    "호환되지 않는 변경은 새 버전 경로(/api/v2)로 나가요. v1에서는 필드가 추가만 되고 이름은 바뀌지 않아요.",
    "프로젝트 이름과 연락처를 담은 User-Agent를 설정해 주세요. 예의 바른 스크립트를 차단한 적은 한 번도 없어요.",
  ],
  scriptLead: (x: ApiView) => `대시보드, Discord 봇, 스프레드시트, 연구가 목적이면 스크립트를 짜세요. API는 그걸 위한 거예요. 실제로 iPhone Duo를 사는 게 목적이면 스크립트는 더 느린 도구예요: 다음 폴링에서, 최대 30초 뒤에 재입고를 보고, 그다음 그걸 전달해야 하죠. 저희 푸시 알림은 같은 매장을 ${SPEED.fastSec}초마다 읽고 재입고를 확인한 뒤 약 ${SPEED.alertSec}초 만에 발송돼요. ${x.storesNow !== undefined ? "1분 안팎인 판매 유지 중앙값 안에요" : "판매 유지 중앙값 안에요"}. 많은 분이 둘 다 써요: 사는 건 알림으로, 지켜보는 건 API로.`,
  scriptCaption: "폴링 스크립트 vs 푸시 알림",
  scriptHead: ["", "이 API를 쓰는 내 스크립트", "PickupChecker 알림"],
  scriptRows: () => [
    { k: "재입고를 보는 시점", a: "최대 30초(캐시) + 폴링 간격", b: `확인에서 본 뒤 약 ${SPEED.alertSec}초 만에 푸시 발송` },
    { k: "휴대폰에 닿는 방법", a: "직접 만든 것(이메일, 봇, SMS)", b: "홈 화면 앱의 알림" },
    { k: "지켜보는 매장", a: "매 호출마다 전부", b: `고른 매장은 ${SPEED.fastSec}초마다, 전체 매장은 ${SPEED.checkSec}초마다` },
    { k: "비용", a: "무료", b: "알림은 요금제, 이 사이트 읽기는 무료" },
  ],
  appleLead: "할 수 있어요, 한도 안에서: apple.com 픽업 페이지는 매장·구성별로 답하고, 저희가 읽는 것도 바로 그거예요. 일회성 스크립트에 빠지는 건 세심함이에요. Apple이 계속 답하게 하는 IPv6 로테이션, 깜빡이는 ‘불가’가 가짜 재입고가 되지 않게 하는 두 번 관찰 규칙, 매장마다의 시간대 처리, 출시일부터 쌓아 온 기록. 답만 원하면 API가 그 일을 대신 해 둔 거고, 배우고 싶다면 작동 방식 페이지가 하나하나 설명해요.",
  appleKeys: () => [
    "Apple 페이지는 스냅숏이에요. 지금을 말해 주지만, 재고가 얼마나 갔는지나 마지막 재입고가 언제였는지는 절대 말해 주지 않아요.",
    `저희 확인은 매장마다 ${SPEED.checkSec}초 간격이고 ${SPEED.fastSec}초보다 빠르게는 절대 안 해요. 그보다 세게 apple.com을 폴링하는 스크립트는 차단되고 아무것도 배우지 못해요.`,
  ],
  methodLead: (x: ApiView) => `모든 숫자는 PickupChecker가 ${storesPhrase(x)}의 Apple 자체 매장 픽업 재고 정보를 ${SPEED.checkSec}초마다(알림 매장은 ${SPEED.fastSec}초마다) 읽은 결과예요. 변화는 일치하는 두 번의 관찰 뒤에만 반영하고, 공백 뒤 처음 보인 건 재입고가 아니에요. API는 이 사이트의 페이지가 읽는 것과 같은 표를 그대로 내보내요. 샘플링도 추정도 없어요.`,
  methodKeys: () => ["전체 방법: 작동 방식 페이지.", "출처 표기가 값의 전부예요. 링크 하나가 이걸 무료로 유지해 줘요."],
  faq: (x: ApiView): Faq[] => [
    { q: `${dom(x.c)} Apple Store의 iPhone Duo 재고를 주는 무료 API가 있나요?`, a: `네, PickupChecker의 API가 있어요. https://pickupchecker.com/api/v1/${x.c.cc}/stock: ${dom(x.c)} 모든 Apple Store와 지금 픽업 가능한 구성, JSON, 키 없음, 30초 캐시. 두 번째 엔드포인트는 최근 24시간 확인된 재입고를 돌려줘요.` },
    { q: "Apple의 공식 재고 API가 있나요?", a: "공개된 건 없어요. apple.com 픽업 페이지를 매장·구성별로 읽을 수 있고, 이 사이트가 그 일을 세심하게(로테이션, 재확인, 시간대) 하고 있어요. 여기 API는 그 작업을 JSON으로 드러낸 거예요." },
    { q: "데이터는 얼마나 최신인가요?", a: `매장마다 ${SPEED.checkSec}초마다(알림 매장은 ${SPEED.fastSec}초마다) 확인하고 API 응답은 30초 캐시되니, 어떤 수치든 길어도 약 45초 전 것이에요. 정확한 시각은 last_checked_at에 있어요.` },
    { q: "상업용 제품에 써도 되나요?", a: "네, 출처를 표기하면요: 데이터가 보이는 곳마다 ‘출처: PickupChecker’를 pickupchecker.com 링크와 함께 표시하고, 폴링 간격은 30초 이상으로요. 키는 필요 없어요." },
    { q: "스크립트가 알림보다 iPhone Duo를 더 빨리 구해 주나요?", a: `아니요: 스크립트는 다음 폴링에서, 최대 30초 뒤에 재입고를 봐요. 알림은 재입고를 확인하고 저희가 본 뒤 약 ${SPEED.alertSec}초 만에 발송돼요. 지켜보는 건 스크립트로, 사는 건 알림으로.` },
  ],
  sources: { pickup: "Apple: 매장 픽업", method: "PickupChecker: 확인 방식", log: "PickupChecker: 재입고 기록" },
  ld: (x: ApiView) => ({
    description: `${storesPhrase(x)}의 iPhone Duo 픽업 재고 무료 JSON API: 매장·구성별 현재 재고, 최근 24시간 확인된 재입고.`,
  }),
  related: "이어서 읽기",
  sameData: "같은 데이터, 다른 질문",
  otherCountries: "다른 나라의 같은 페이지",
  questions: { alerts: "가장 빨리 알림 받는 법", howItWorks: "확인 방식", restockTimes: "Apple은 iPhone Duo를 언제 재입고하나요?", shortage: "품귀는 풀리고 있나요?", configs: "가장 많이 재입고되는 구성은?", stockChecker: "iPhone Duo 재고 확인" },
  setUpAlert: "알림 설정하기",
  tryIt: "실시간 JSON 열기",
  faqTitle: "자주 묻는 질문",
  onThisPage: "이 페이지 목차",
};

export const decide: DecideDict = { configs, supply, channels, api };
