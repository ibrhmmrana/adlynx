"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type { ScanResult, Product } from "@/lib/brand/types";
import type { GbpProfile } from "@/lib/gbp/types";
import { ProductListPanel } from "@/components/brand/ProductList";
import { AssetLibrary } from "@/components/brand/AssetLibrary";

type Step = "hero" | "connect" | "details" | "profile" | "products";

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12.002 2.04c-5.523 0-10 4.476-10 10 0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988c4.78-.75 8.437-4.887 8.437-9.878 0-5.524-4.477-10-10-10z" /></svg>
  );
}
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.11V9.02a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.87a8.28 8.28 0 004.77 1.52V7a4.85 4.85 0 01-1-.31z" /></svg>
  );
}
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
  );
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()} className="h-10 w-10 shrink-0 rounded-xl border-2 border-gray-200 transition hover:border-brand-300" style={{ backgroundColor: value || "#e5e7eb" }} />
      <input ref={ref} type="color" value={value || "#cccccc"} onChange={(e) => onChange(e.target.value)} className="invisible absolute h-0 w-0" />
      <div>
        <p className="text-[13px] font-medium text-gray-600">{label}</p>
        <p className="font-mono text-[12px] text-gray-400">{value || "Not detected"}</p>
      </div>
    </div>
  );
}

const ONBOARDING_URL_KEY = "adlynx_onboarding_url";

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("hero");
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [gbpProfile, setGbpProfile] = useState<GbpProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const connectScanStarted = useRef(false);
  const bootstrapAttempted = useRef(false);
  const [scanTrigger, setScanTrigger] = useState(0);

  const [brandName, setBrandName] = useState("");
  const [sellingType, setSellingType] = useState<"products" | "saas" | "services" | "">("");
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [colors, setColors] = useState({ primary: "", secondary: "", accent: "" });
  const [mission, setMission] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === "connect") {
      const urlFromQuery = searchParams.get("url");
      const savedUrl = typeof window !== "undefined" ? sessionStorage.getItem(ONBOARDING_URL_KEY) : null;
      const toRestore = urlFromQuery ? decodeURIComponent(urlFromQuery) : savedUrl;
      if (toRestore) setUrl(toRestore);
      setStep("connect");
    }
  }, [searchParams]);

  useEffect(() => {
    if (step === "products") window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    if (!scanResult) return;
    const fromGbp = gbpProfile?.locations?.[0]?.locationName;
    setBrandName(fromGbp || scanResult.businessName || "");
    setSellingType(scanResult.sellingType || "");
    setLogoUrl(scanResult.logoUrl || "");
    setTagline(scanResult.tagline || "");
    setColors({
      primary: scanResult.colors.primary || "",
      secondary: scanResult.colors.secondary || "",
      accent: scanResult.colors.accent || "",
    });
    setMission(scanResult.mission || "");
    setProducts(scanResult.products || []);
    setAllImages(scanResult.allImages || []);
  }, [scanResult, gbpProfile]);

  useEffect(() => {
    if (step !== "connect" || !url.trim() || connectScanStarted.current) return;
    connectScanStarted.current = true;
    setScanning(true);
    setScanError(null);
    setBootstrapError(null);
    setWorkspaceId(null);
    bootstrapAttempted.current = false;
    fetch("/api/scan/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.scanResult) {
          setScanResult(data.scanResult);
        } else {
          setScanError(data.error || "Scan failed");
        }
      })
      .catch(() => setScanError("Scan failed"))
      .finally(() => setScanning(false));
  }, [step, url, scanTrigger]);

  async function runBootstrap() {
    if (!scanResult) return;
    setBootstrapping(true);
    setBootstrapError(null);
    try {
      const res = await fetch("/api/workspace/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanResult }),
      });
      const data = await res.json();
      if (res.ok && data.workspaceId) {
        setWorkspaceId(data.workspaceId);
      } else {
        setBootstrapError(data.error || "Failed to save workspace");
      }
    } catch {
      setBootstrapError("Failed to save workspace");
    } finally {
      setBootstrapping(false);
      bootstrapAttempted.current = true;
    }
  }

  useEffect(() => {
    if (step === "connect" && scanResult && !scanning && !workspaceId && !bootstrapAttempted.current) {
      runBootstrap();
    }
  }, [step, scanResult, scanning, workspaceId]);

  useEffect(() => {
    if (step !== "connect" && step !== "details") return;
    fetch("/api/gbp/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data ? setGbpProfile(data) : null))
      .catch(() => {});
  }, [step]);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setScanError(null);
    setScanResult(null);
    connectScanStarted.current = false;
    bootstrapAttempted.current = false;
    if (typeof window !== "undefined") sessionStorage.setItem(ONBOARDING_URL_KEY, url.trim());
    setStep("connect");
  }

  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "profile", label: "Brand" },
    { key: "products", label: "Products" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);
  const showStepIndicator = step !== "hero" && step !== "connect";

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 z-50 w-full border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a href="/onboarding" onClick={(e) => { e.preventDefault(); setStep("hero"); setScanResult(null); setScanError(null); }} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">AdLynx</span>
          </a>
          {showStepIndicator && (
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <button type="button" onClick={() => { if (i <= stepIndex || scanResult) setStep(s.key); }} disabled={i > stepIndex && !scanResult}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${step === s.key ? "bg-brand-600 text-white" : i < stepIndex || scanResult ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-gray-50 text-gray-300"}`}>
                    {s.label}
                  </button>
                  {i < steps.length - 1 && <div className={`mx-1 h-px w-4 ${i < stepIndex ? "bg-brand-300" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
          )}
          {step === "hero" && <a href="#try" className="rounded-full bg-gray-900 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-gray-800">Try it free</a>}
        </div>
      </header>

      {step === "hero" && (
        <section id="try" className="hero-grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-14">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="orb absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-brand-200/40 blur-[120px]" />
            <div className="orb orb-delay absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-indigo-200/30 blur-[100px]" />
            <div className="orb orb-delay-2 absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-violet-100/40 blur-[80px]" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
            <div className="animate-fade-in flex items-center justify-center gap-3">
              {[{ Icon: MetaIcon, color: "text-[#1877F2]", name: "Meta" }, { Icon: GoogleIcon, color: "", name: "Google" }, { Icon: TikTokIcon, color: "text-gray-900", name: "TikTok" }, { Icon: InstagramIcon, color: "text-[#E4405F]", name: "Instagram" }].map(({ Icon, color, name }) => (
                <div key={name} className="flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-3 py-1 shadow-sm">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-[12px] font-medium text-gray-500">{name}</span>
                </div>
              ))}
            </div>
            <h1 className="animate-fade-up mt-8 text-balance text-4xl font-bold leading-[1.12] tracking-tight text-gray-900 sm:text-5xl md:text-[3.5rem]">
              Paste your URL.<br />Get <span className="font-serif italic text-brand-600">performance ads</span> in minutes.
            </h1>
            <form onSubmit={handleScan} className="animate-fade-up mx-auto mt-10 w-full max-w-xl" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-900/[0.04] transition-all focus-within:border-brand-300 focus-within:shadow-brand-500/[0.08] focus-within:ring-4 focus-within:ring-brand-50">
                <div className="pl-3 text-gray-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <input type="text" inputMode="url" autoComplete="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourwebsite.com" className="flex-1 bg-transparent py-2.5 pl-1 text-[15px] text-gray-900 outline-none placeholder:text-gray-400" />
                <button type="submit" className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Scan website
                </button>
              </div>
              {scanError && <p className="mt-3 text-sm font-medium text-red-500">{scanError}</p>}
            </form>
            <div className="animate-fade-up mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray-400" style={{ animationDelay: "0.3s" }}>
              {["No sign-up required", "Brand kit in seconds", "ROAS-optimised creative"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === "connect" && (
        <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-14">
          <div className="mx-auto w-full max-w-md text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Connect your Google Business Profile</h2>
            <p className="mt-2 text-[15px] text-gray-500">While you sign in, we&apos;ll analyze your website so your details are ready when you are.</p>

            {gbpProfile && (gbpProfile.locations.length > 0 || gbpProfile.averageRating != null) && (
              <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
                  <GoogleIcon className="h-4 w-4 shrink-0" />
                  Your Google Business Profile
                </div>
                <div className="mt-3 space-y-1.5 text-[14px] text-gray-700">
                  {gbpProfile.locations[0]?.locationName && (
                    <p className="font-medium text-gray-900">{gbpProfile.locations[0].locationName}</p>
                  )}
                  {gbpProfile.averageRating != null && (
                    <p className="flex items-center gap-1.5">
                      <span className="text-amber-500">★</span>
                      <span>{gbpProfile.averageRating}</span>
                      {gbpProfile.totalReviewCount > 0 && (
                        <span className="text-gray-500">({gbpProfile.totalReviewCount} reviews)</span>
                      )}
                    </p>
                  )}
                  {gbpProfile.locations[0]?.address && (
                    <p className="text-gray-600">{gbpProfile.locations[0].address}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-6">
              {scanning && (
                <div className="flex items-center gap-3 rounded-full border border-brand-100 bg-brand-50 px-5 py-2.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
                  <span className="text-[13px] font-medium text-brand-700">Analyzing your website...</span>
                </div>
              )}
              {bootstrapping && !scanning && (
                <div className="flex items-center gap-3 rounded-full border border-brand-100 bg-brand-50 px-5 py-2.5">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
                  <span className="text-[13px] font-medium text-brand-700">Saving your workspace...</span>
                </div>
              )}
              {scanError && <p className="text-sm font-medium text-red-500">{scanError}</p>}
              {bootstrapError && <p className="text-sm font-medium text-red-500">{bootstrapError}</p>}
              {!scanning && scanResult && !bootstrapping && !bootstrapError && workspaceId && (
                <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-[13px] font-medium text-green-800">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Workspace saved
                </div>
              )}
              {!url.trim() && !scanning && (
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left">
                  <p className="mb-2 text-[13px] font-medium text-amber-900">No website URL found. Enter it below to analyze:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="yourwebsite.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (url.trim()) {
                          sessionStorage.setItem(ONBOARDING_URL_KEY, url.trim());
                          connectScanStarted.current = false;
                          setScanTrigger((t) => t + 1);
                        }
                      }}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-700"
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              )}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => {
                    const base = typeof window !== "undefined" ? window.location.origin : "";
                    const callbackUrl = url.trim()
                      ? `${base}/onboarding?step=connect&url=${encodeURIComponent(url.trim())}`
                      : `${base}/onboarding?step=connect`;
                    signIn("google", { callbackUrl });
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Sign in with Google Business Profile
                </button>
                <p className="mt-3 text-[12px] text-gray-400">We&apos;ll use your business name, ratings and reviews to prefill your profile.</p>
              </div>
            </div>
            {!scanning && scanResult && workspaceId && (
              <button type="button" onClick={() => router.push("/app")} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]">
                Continue to dashboard
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
            )}
            {!scanning && scanResult && bootstrapError && (
              <button type="button" onClick={() => runBootstrap()} disabled={bootstrapping} className="mt-6 rounded-xl bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">
                Retry saving workspace
              </button>
            )}
            {!scanning && scanResult && !workspaceId && !bootstrapError && !bootstrapping && (
              <button type="button" onClick={() => setStep("details")} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-[14px] font-semibold text-gray-700 transition hover:bg-gray-50">
                Continue to details
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
            )}
            <p className="mt-6">
              <button type="button" onClick={() => router.push("/app")} className="text-[13px] text-gray-500 underline hover:text-gray-700">
                Go to dashboard
              </button>
            </p>
          </div>
        </section>
      )}

      {step === "details" && (
        <section className="flex min-h-screen items-center justify-center px-6 pt-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Tell us about your brand</h2>
              <p className="mt-2 text-[15px] text-gray-500">Confirm your details below.</p>
            </div>
            {gbpProfile && (gbpProfile.totalReviewCount > 0 || gbpProfile.locations.length > 0) && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700"><GoogleIcon className="h-4 w-4" /> From Google Business Profile</div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-gray-600">
                  {gbpProfile.averageRating != null && <span className="flex items-center gap-1">★ {gbpProfile.averageRating}{gbpProfile.totalReviewCount > 0 && <span className="text-gray-400">({gbpProfile.totalReviewCount} reviews)</span>}</span>}
                  {gbpProfile.locations[0]?.locationName && <span>Business: {gbpProfile.locations[0].locationName}</span>}
                </div>
                {gbpProfile.reviews.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                    {gbpProfile.reviews.slice(0, 3).map((r, i) => (
                      <div key={i} className="text-[12px] text-gray-600">
                        <span className="font-medium text-gray-700">{r.reviewerDisplayName}</span>
                        <span className="text-gray-400"> · </span>
                        <span>{["ONE", "TWO", "THREE", "FOUR", "FIVE"].indexOf(r.starRating) + 1}★</span>
                        {r.comment && <p className="mt-0.5 line-clamp-2 text-gray-500">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Brand name</label>
                <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your brand name" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50" />
              </div>
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">What are you selling?</label>
                <select value={sellingType} onChange={(e) => setSellingType(e.target.value as typeof sellingType)} className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50">
                  <option value="">Select...</option>
                  <option value="products">Products</option>
                  <option value="saas">SaaS / Digital</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>
            <button type="button" disabled={!brandName.trim() || !sellingType} onClick={() => setStep("profile")} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
              Continue
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        </section>
      )}

      {step === "profile" && (
        <section className="min-h-screen px-6 pb-12 pt-24">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Your brand profile</h2>
              <p className="mt-1 text-[15px] text-gray-500">Review and edit what we extracted.</p>
            </div>
            <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-gray-700">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" /> : <span className="text-[11px] text-gray-400">No logo</span>}
                  </div>
                  <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL" className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Business name</label>
                <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50" />
              </div>
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Tagline</label>
                <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your brand tagline" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50" />
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-gray-700">Brand colors</label>
                <div className="grid grid-cols-3 gap-4">
                  <ColorSwatch label="Primary" value={colors.primary} onChange={(v) => setColors((c) => ({ ...c, primary: v }))} />
                  <ColorSwatch label="Secondary" value={colors.secondary} onChange={(v) => setColors((c) => ({ ...c, secondary: v }))} />
                  <ColorSwatch label="Accent" value={colors.accent} onChange={(v) => setColors((c) => ({ ...c, accent: v }))} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Mission</label>
                <textarea value={mission} onChange={(e) => setMission(e.target.value)} rows={3} placeholder="Your brand mission..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-gray-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50" />
              </div>
            </div>
            <button type="button" onClick={() => setStep("products")} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]">
              Continue to Products
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </div>
        </section>
      )}

      {step === "products" && (
        <section className="min-h-screen px-6 pb-12 pt-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Products</h2>
              <p className="mt-1 text-[15px] text-gray-500">
                {products.length > 0 ? `We found ${products.length} product${products.length === 1 ? "" : "s"} on your website.` : "No products were auto-detected. Add them manually below."}
              </p>
            </div>
            <ProductListPanel products={products} onProductsChange={setProducts} />
            <div className="mt-12">
              <h3 className="text-xl font-bold tracking-tight text-gray-900">Asset library</h3>
              <p className="mt-1 mb-4 text-[15px] text-gray-500">All images extracted from your website.</p>
              <AssetLibrary images={allImages} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#fafafa]"><span className="text-gray-400">Loading...</span></div>}>
      <OnboardingWizard />
    </Suspense>
  );
}
