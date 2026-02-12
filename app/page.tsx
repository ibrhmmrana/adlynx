"use client";

import { useState, useRef, useEffect } from "react";
import { BrandProfileCard } from "@/components/brand/BrandProfileCard";
import type { BrandProfile } from "@/lib/brand/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (profile && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setProfile(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scan/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setProfile(data.brandProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="text-xl font-semibold tracking-tight text-slate-900">
            AdLynx
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#product" className="text-sm text-slate-600 hover:text-slate-900">
              Product
            </a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">
              Pricing
            </a>
            <a href="#contact" className="text-sm text-slate-600 hover:text-slate-900">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
            >
              Sign In
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div>
            <div className="inline-block rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-sm text-slate-600 shadow-sm">
              From URL to ads in 2 minutes.
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Your website. Your brand.{" "}
              <span className="text-slate-900 underline decoration-blue-400/60 decoration-2 underline-offset-4">
                We turn it into ads.
              </span>
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              AdLynx scans your site and builds your brand profile—so you can
              launch performance campaigns without the guesswork.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. example.com or https://example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-medium text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Scan my website
                  </>
                )}
              </button>
            </form>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <img
                src="/assets/pexels-antoni-shkraba-768x522.jpeg"
                alt=""
                className="w-full aspect-[4/3] object-cover rounded-2xl"
                width={768}
                height={522}
              />
              <div className="absolute left-4 top-4 rounded-lg border border-violet-200 bg-white/95 px-4 py-2 shadow-lg">
                <span className="text-xs font-medium text-violet-700">Brand detected</span>
              </div>
              <div className="absolute right-6 top-1/3 rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-2 shadow-lg">
                <span className="text-xs font-medium text-amber-800">Services & USPs</span>
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg border border-blue-200 bg-white/95 px-4 py-2 shadow-lg">
                <span className="text-xs font-medium text-blue-700">Ready for ads</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {profile && (
        <section ref={resultsRef} className="w-full border-t border-slate-200 bg-white/50 py-12">
          <div className="mx-auto max-w-[1600px] px-6">
            <h2 className="text-2xl font-semibold text-slate-900">Brand profile</h2>
            <p className="mt-1 text-slate-600">We extracted this from the website you scanned.</p>
            <div className="mt-6 w-full">
              <BrandProfileCard profile={profile} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
