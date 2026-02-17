"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type WorkspaceInfo = {
  id: string;
  business_name: string | null;
  domain: string | null;
  logo_external_url: string | null;
  logo_storage_path: string | null;
};

function AppHomeContent() {
  const searchParams = useSearchParams();
  const workspaceIdParam = searchParams.get("workspaceId");
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = workspaceIdParam
      ? `/api/workspace/current?workspaceId=${encodeURIComponent(workspaceIdParam)}`
      : "/api/workspace/current";
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setWorkspace(null);
        } else {
          setWorkspace(data.workspace ?? null);
        }
      })
      .catch(() => setError("Failed to load workspace"))
      .finally(() => setLoading(false));
  }, [workspaceIdParam]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error}</p>
        <Link href="/" className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:underline">
          Start a new scan
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        {workspace?.logo_external_url ? (
          <img
            src={workspace.logo_external_url}
            alt=""
            className="h-12 w-12 rounded-xl border border-gray-200 object-contain bg-white p-1"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-lg font-semibold text-gray-500">
            {(workspace?.business_name || "W")[0]}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{workspace?.business_name || "Your workspace"}</h1>
          <p className="text-[14px] text-gray-500">{workspace?.domain || ""}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Start here</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/app/products"
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <span className="font-medium text-gray-900">Products</span>
            <p className="mt-1 text-[13px] text-gray-500">Add and manage products</p>
          </Link>
          <Link
            href="/app/dna"
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <span className="font-medium text-gray-900">DNA</span>
            <p className="mt-1 text-[13px] text-gray-500">Brand DNA and voice</p>
          </Link>
          <Link
            href="/app/library"
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <span className="font-medium text-gray-900">Library</span>
            <p className="mt-1 text-[13px] text-gray-500">Assets and creatives</p>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Most popular</h2>
        <div className="flex flex-wrap gap-3">
          {["Concept", "Clone", "Variations", "Animate"].map((name) => (
            <div
              key={name}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-[14px] font-medium text-gray-700 shadow-sm"
            >
              {name}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-gray-400">Generators coming soon</p>
      </section>
    </div>
  );
}

export default function AppHome() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
        </div>
      }
    >
      <AppHomeContent />
    </Suspense>
  );
}
