"use client";

import Link from "next/link";

export default function LibraryPage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">Library</h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">Assets and creatives will appear here.</p>
        <Link href="/app" className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
