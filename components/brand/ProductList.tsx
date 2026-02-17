"use client";

import { useState, useRef, useEffect } from "react";
import type { Product } from "@/lib/brand/types";

/* ── Product sidebar item ── */
function ProductItem({
  product,
  selected,
  onSelect,
  onDelete,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const thumb = product.images[0];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        selected
          ? "bg-brand-50 ring-1 ring-brand-200"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-gray-800">
        {product.title || "Untitled"}
      </span>
      <span
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </span>
    </button>
  );
}

/* ── Product detail panel ── */
function ProductDetail({
  product,
  onChange,
}: {
  product: Product;
  onChange: (updated: Product) => void;
}) {
  const primaryImage = product.images[0];
  const otherImages = product.images.slice(1);

  return (
    <div className="space-y-6">
      {/* Product images: main image left, horizontal scroller for thumbs only */}
      <div className="min-w-0 overflow-hidden">
        <p className="mb-2 text-[14px] font-semibold text-gray-700">Product images</p>
        <div className="flex gap-4 min-w-0">
          {/* Main image */}
          <div className="h-[280px] w-[280px] shrink-0 overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50">
            {primaryImage ? (
              <img src={primaryImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[13px] text-gray-400">
                No images
              </div>
            )}
          </div>
          {/* Horizontal scroller for thumbs only (no page scroll) */}
          {otherImages.length > 0 && (
            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50">
              <div
                className="flex h-[280px] flex-nowrap gap-2 overflow-x-auto overflow-y-hidden p-2"
                style={{ scrollbarGutter: "stable" }}
              >
                {otherImages.map((img, i) => (
                  <div
                    key={i}
                    className="h-full w-[140px] shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-[14px] font-semibold text-gray-700">
          Product Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={product.title}
          onChange={(e) => onChange({ ...product, title: e.target.value })}
          placeholder="Enter title for new product..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-[14px] font-semibold text-gray-700">
          Description <span className="ml-1 text-[12px] font-normal text-gray-400">Optional</span>
        </label>
        <textarea
          value={product.description}
          onChange={(e) => onChange({ ...product, description: e.target.value })}
          rows={5}
          placeholder="Enter description for new product..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-gray-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
        />
      </div>
    </div>
  );
}

/* ── Add product panel ── */
function AddProductPanel({
  onImportUrl,
  onManualAdd,
  importing,
}: {
  onImportUrl: (url: string) => void;
  onManualAdd: (product: Product) => void;
  importing: boolean;
}) {
  const [importUrl, setImportUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [manualImages, setManualImages] = useState<string[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setManualImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="space-y-6">
      {/* Import from URL */}
      <div>
        <p className="mb-1.5 text-[14px] font-semibold text-gray-700">
          Quick import from URL <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-400">Optional</span>
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="www.products.com"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-[14px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
              disabled={importing}
            />
          </div>
          <button
            type="button"
            disabled={importing || !importUrl.trim()}
            onClick={() => { onImportUrl(importUrl.trim()); setImportUrl(""); }}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {importing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <p className="mb-3 text-[14px] font-semibold text-gray-700">Or add manually</p>

        {/* Images upload */}
        <div className="mb-4">
          <p className="mb-1.5 text-[13px] font-medium text-gray-500">
            Product images <span className="text-red-400">*</span>
          </p>
          <div className="grid grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 col-span-2 row-span-2"
            >
              <div className="text-center">
                <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <span className="mt-1 block text-[12px]">Drop image here or click to upload</span>
              </div>
            </button>
            {manualImages.map((img, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img src={img} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="mb-1 block text-[14px] font-semibold text-gray-700">
            Product Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Enter title for new product..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-1 block text-[14px] font-semibold text-gray-700">
            Description <span className="ml-1 text-[12px] font-normal text-gray-400">Optional</span>
          </label>
          <textarea
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
            rows={4}
            placeholder="Enter description for new product..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-gray-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
          />
        </div>

        <button
          type="button"
          disabled={!manualTitle.trim()}
          onClick={() => {
            onManualAdd({
              id: `manual-${Date.now()}`,
              title: manualTitle.trim(),
              description: manualDesc.trim(),
              images: manualImages,
              url: "",
            });
            setManualTitle("");
            setManualDesc("");
            setManualImages([]);
          }}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Add product
        </button>
      </div>
    </div>
  );
}

/* ── Main export ── */
export function ProductListPanel({
  products,
  onProductsChange,
}: {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);

  // Default to first product when list has items and none selected
  useEffect(() => {
    if (products.length > 0 && !showAdd && selectedId === null) {
      setSelectedId(products[0].id);
    }
  }, [products, showAdd, selectedId]);

  const selected = products.find((p) => p.id === selectedId) ?? products[0] ?? null;

  function handleProductChange(updated: Product) {
    onProductsChange(products.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleDelete(id: string) {
    onProductsChange(products.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleImportUrl(url: string) {
    setImporting(true);
    try {
      const res = await fetch("/api/scan/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && data.product) {
        onProductsChange([...products, data.product]);
        setSelectedId(data.product.id);
        setShowAdd(false);
      }
    } catch { /* swallow */ }
    setImporting(false);
  }

  function handleManualAdd(product: Product) {
    onProductsChange([...products, product]);
    setSelectedId(product.id);
    setShowAdd(false);
  }

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Sidebar: scrollable product list */}
      <div className="flex max-h-[calc(100vh-10rem)] w-64 shrink-0 flex-col">
        <button
          type="button"
          onClick={() => { setShowAdd(true); setSelectedId(null); }}
          className={`mb-3 flex w-full shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-medium transition ${
            showAdd
              ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
              : "text-brand-600 hover:bg-brand-50"
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add product manually
        </button>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {products.map((p) => (
            <ProductItem
              key={p.id}
              product={p}
              selected={!showAdd && selectedId === p.id}
              onSelect={() => { setSelectedId(p.id); setShowAdd(false); }}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
        {products.length === 0 && !showAdd && (
          <p className="mt-4 text-center text-[13px] text-gray-400">
            No products found
          </p>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6">
        {showAdd ? (
          <AddProductPanel
            onImportUrl={handleImportUrl}
            onManualAdd={handleManualAdd}
            importing={importing}
          />
        ) : selected ? (
          <ProductDetail product={selected} onChange={handleProductChange} />
        ) : (
          <div className="flex h-full items-center justify-center text-[14px] text-gray-400">
            Select a product to view details
          </div>
        )}
      </div>
    </div>
  );
}
