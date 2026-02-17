"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", label: "Home" },
  { href: "/app/library", label: "Library" },
  { href: "/app/dna", label: "DNA" },
  { href: "/app/products", label: "Products" },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {navItems.map(({ href, label }) => {
        const isActive = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-[14px] font-medium transition ${
              isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
