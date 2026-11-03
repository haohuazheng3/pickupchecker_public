/** العربية: modules (الخريطة المصغّرة، وحاشية المتتبعات الأخرى المشتركة بين وحدات الخادم والعميل). */
import type { CDict } from "../en";

export const modules: CDict["modules"] = {
  minimap: {
    aria: "افتح {label} على الخريطة المباشرة",
    cta: "افتح على الخريطة المباشرة ←",
  },
  reports: {
    legend: "أبلغت عنها متتبعات أخرى ({sources})، {range}",
    note: "{mark}: {what} نشرتها {links} للفترة {range}. هي ملاحظات تلك المواقع، لا حالات توفر أكدها PickupChecker، ولا يدخل أيٌّ منها في أرقامنا.",
    what: "حالات توفر {models}",
    whatAny: "حالات توفر",
    markDashed: "الأعمدة المتقطعة",
    markDashedRings: "الحلقات المتقطعة",
    markHollowDots: "النقاط المفرغة",
  },
};
