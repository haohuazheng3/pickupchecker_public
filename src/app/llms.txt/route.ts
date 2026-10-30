export function GET() {
  return new Response(`# PickupChecker\n\n> Phone notifications the moment an iPhone Duo, 18 Pro or 18 Pro Max is available for in-store pickup at any of the 269 Apple Stores in the US. Plus $5/month (10 alert rules), Pro $10/month (20); browsing is free.\n\n- Live stock: /stock/iphone-duo, /stock/iphone-18-pro, /stock/iphone-18-pro-max\n- Restock log: /restocks\n- Live map: /map\n- Stores by state: /stores\n- How it works: /how-it-works\n- Pricing: /pricing\n`, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
