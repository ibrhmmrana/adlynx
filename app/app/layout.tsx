import Link from "next/link";
import { AppSidebar } from "@/components/app/AppSidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">AdLynx</span>
          </a>
        </div>
        <AppSidebar />
      </aside>
      <main className="flex-1 pl-56">{children}</main>
    </div>
  );
}
