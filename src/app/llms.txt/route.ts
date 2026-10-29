export function GET() {
  return new Response(`# PickupChecker\n\n> Email alerts the moment an iPhone 18 Pro, 18 Pro Max or iPhone Duo is available for in-store pickup at any of the 269 Apple Stores in the US. $5/month per model.\n\n- Live stock: /stock/iphone-18-pro, /stock/iphone-18-pro-max, /stock/iphone-duo\n- Stores by state: /stores\n- How it works: /how-it-works\n- Pricing: /pricing\n`, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
