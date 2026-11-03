/**
 * العربية: صيغ العدد لنصوص العميل (بيانات خام تُرسل إلى المتصفح). العربية تميّز المفرد والمثنى و3–10 و11–99 و100+،
 * والقيمة zero تُقرأ كالجمع. حيث يحدد النوع الإنجليزي { one, other } فقط، نحتفظ بالصيغ كلها ونطابق النوع.
 */
import type { Forms } from "@/lib/i18n/format";

export const F = (f: { one: string; two: string; few: string; many: string; other: string; zero?: string }): Forms => ({ zero: f.zero ?? f.few, ...f });
/** The same forms where the English type is a plain { one, other } (plural() reads every key at runtime). */
export const P = (f: { one: string; two: string; few: string; many: string; other: string; zero?: string }) => F(f) as { one: string; other: string };
