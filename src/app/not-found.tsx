import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
      <div className="eyebrow">404</div>
      <h1 className="display mt-2 text-3xl sm:text-5xl">Nothing here</h1>
      <p className="mt-4 text-ink-2">That page doesn&apos;t exist. Try <Link href="/stores" className="underline decoration-line-2 hover:text-ink">stores by state</Link> or the <Link href="/map" className="underline decoration-line-2 hover:text-ink">live map</Link>.</p>
      <Link href="/" className="btn btn-primary mt-6">Back home</Link>
    </div>
  );
}
