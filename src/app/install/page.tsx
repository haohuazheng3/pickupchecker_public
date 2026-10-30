import type { Metadata } from "next";
import { env } from "@/lib/env";
import { InstallGuide } from "@/components/push/InstallGuide";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Get the app — restock alerts on your Home Screen",
  description: "Add PickupChecker to your Home Screen and get a notification the moment an iPhone Duo, 18 Pro or Pro Max is in stock for pickup near you.",
  alternates: { canonical: "/install" },
};

export default function InstallPage() {
  return <InstallGuide vapidPublicKey={env.vapidPublicKey()} />;
}
