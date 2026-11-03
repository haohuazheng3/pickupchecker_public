import type { Metadata } from "next";
import { env } from "@/lib/env";
import { InstallGuide } from "@/components/push/InstallGuide";
import { requestLocale, setPageLocale } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";

export const dynamic = "force-dynamic";
/** An app page: the person's language (the guide itself reads it on the client). */
export async function generateMetadata(): Promise<Metadata> {
  const d = dict((await requestLocale()).lang).account.install;
  return { title: d.metaTitle, description: d.metaDescription, alternates: { canonical: "/install" } };
}

export default async function InstallPage() {
  setPageLocale(await requestLocale());
  return <InstallGuide vapidPublicKey={env.vapidPublicKey()} />;
}
