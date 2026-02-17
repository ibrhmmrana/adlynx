"use client";

import { useState } from "react";

export function AssetLibrary({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const shown = images.slice(0, visibleCount);

  if (images.length === 0) {
    return (
      <p className="py-8 text-center text-[14px] text-gray-400">
        No images extracted from this website.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {shown.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(img)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-brand-300 hover:shadow-md"
          >
            <img
              src={img}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {visibleCount < images.length && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 24)}
            className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
          >
            Show more ({images.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[85vh] max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox} alt="" className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain" />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-lg transition hover:text-gray-900"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
