import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { ChannelsPage, channelsMetadata } from "@/components/pages/decide/ChannelsPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return channelsMetadata(US);
}

/** /iphone-duo-apple-vs-carriers-vs-retailers: Apple Store vs carriers vs retailers vs resale for the iPhone Duo (US). */
export default function Page() {
  return <ChannelsPage country={US} />;
}
