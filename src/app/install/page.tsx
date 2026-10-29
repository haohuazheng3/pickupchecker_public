import type { Metadata } from "next";
import { env } from "@/lib/env";
import { InstallGuide } from "@/components/push/InstallGuide";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Get the app — restock alerts on your Home Screen",
  description: "Add PickupChecker to your iPhone or Android Home Screen in a minute and get a notification the second an iPhone 18 Pro, Pro Max or Duo is in stock for pickup near you.",
  alternates: { canonical: "/install" },
};

export default function InstallPage() {
  return <InstallGuide vapidPublicKey={env.vapidPublicKey()} />;
}
