import Link from "next/link";

const nav = [
  { href: "/app", label: "Home" },
  { href: "/app/dna", label: "Context" },
  { href: "/app/products", label: "Products" },
  { href: "/app/library", label: "Library" },
  { href: "/app/inspo", label: "Inspo" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="sticky top-0 flex h-14 items-center border-b border-gray-200 px-4">
          <Link href="/app" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-gray-900">AdLynx</span>
          </Link>
        </div>
        <nav className="p-2">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-lg px-3 py-2 text-[14px] font-medium text-gray-700 transition hover:bg-gray-100"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
