"use client";

import { useState } from "react";
import type { DbProduct } from "@/lib/db/types";

export default function ProductsList({
  workspaceId,
  initialProducts,
}: {
  workspaceId: string;
  initialProducts: DbProduct[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<DbProduct | null>(null);

  return (
    <div className="flex gap-6">
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {products.length === 0 ? (
            <li className="p-8 text-center text-[14px] text-gray-500">No products yet. Add products from onboarding or via API.</li>
          ) : (
            products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`flex w-full items-center gap-4 p-4 text-left transition ${selected?.id === p.id ? "bg-brand-50" : "hover:bg-gray-50"}`}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {(p.images_external && p.images_external[0]) ? (
                      <img src={p.images_external[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No img</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{p.title || "Untitled"}</p>
                    <p className="truncate text-[13px] text-gray-500">{p.price ?? "—"}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      {selected && (
        <div className="w-96 shrink-0 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900">{selected.title || "Untitled"}</h3>
          <p className="mt-1 text-[13px] text-gray-500">{selected.price ?? "—"}</p>
          <p className="mt-3 text-[14px] text-gray-700 line-clamp-4">{selected.description || "No description"}</p>
          {selected.url && (
            <a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] text-brand-600 hover:underline">
              View product
            </a>
          )}
        </div>
      )}
    </div>
  );
}
