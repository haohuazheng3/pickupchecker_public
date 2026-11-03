/** العربية: content — فاحص المخزون في الشاشة الأولى (QuickCheck) وهياكل التحميل. */
import type { CDict } from "../en";

export const content: CDict["content"] = {
  quickCheck: {
    model: "طراز iPhone",
    search: "مدينة أو متجر Apple",
    useLocation: "استخدم موقعي",
    nearMe: "📍 بالقرب مني",
    locationOff: "الموقع متوقف لهذا الموقع. اكتب مدينة بدلًا من ذلك.",
    storesNow: "**{n} من {total}** من متاجر Apple الأمريكية فيها {what} للاستلام الآن",
    nearestTo: " · الأقرب إلى {place}",
    you: "موقعك",
    noMatch: "لا نتيجة. جرّب رمزًا بريديًا من 5 أرقام أو مدينة.",
    inStock: "{n}/{total} متوفرة",
    soldOut: "نفد",
    alertMe: "نبّهني حين يتوفر",
    allStores: "كل المتاجر ({n}) ←",
    here: "هنا",
  },
  skeleton: {
    loading: "جارٍ التحميل",
  },
};
