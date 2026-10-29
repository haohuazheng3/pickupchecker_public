import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 text-center">
      <div className="eyebrow">404</div>
      <h1 className="display mt-2 text-3xl sm:text-5xl">Nothing here</h1>
      <p className="mt-4 text-ink-2">The page you&apos;re after doesn&apos;t exist. Stock pages live under /stock and stores under /stores.</p>
      <Link href="/" className="btn btn-primary mt-6">Back home</Link>
    </div>
  );
}
