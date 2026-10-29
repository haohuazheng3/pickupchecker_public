export function Page({ title, lead, children, wide }: { title: string; lead?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto px-4 pt-10 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <h1 className="display text-3xl sm:text-5xl">{title}</h1>
      {lead && <p className="mt-4 text-lg text-ink-2">{lead}</p>}
      <div className="pane prose-site mt-8 p-6 sm:p-8">{children}</div>
    </div>
  );
}
