"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  title: string | null;
  description: string | null;
  url: string | null;
  images_external: string[] | null;
};

export default function ProductsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/current")
      .then((res) => res.json())
      .then((data) => {
        if (data.error || !data.workspaceId) {
          setError(data.error || "No workspace found");
          return;
        }
        setWorkspaceId(data.workspaceId);
        return fetch(`/api/workspace/${data.workspaceId}/products`);
      })
      .then((res) => {
        if (res && res.ok) return res.json();
        return [];
      })
      .then((list) => {
        if (Array.isArray(list)) setProducts(list);
      })
      .catch(() => setError("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

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
        <Link href="/app" className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">Products</h1>
      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No products yet. Edit and save products from the dashboard later.</p>
          <Link href="/app" className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {p.images_external?.[0] ? (
                <img
                  src={p.images_external[0]}
                  alt=""
                  className="mb-3 h-32 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                  No image
                </div>
              )}
              <h3 className="font-semibold text-gray-900">{p.title || "Untitled"}</h3>
              <p className="mt-1 line-clamp-2 text-[13px] text-gray-500">{p.description || ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
