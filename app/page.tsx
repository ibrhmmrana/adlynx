"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { ScanResult, Product } from "@/lib/brand/types";
import type { AdsetStrategy } from "@/lib/ads/adsetStrategy";
import { ProductListPanel } from "@/components/brand/ProductList";
import { AssetLibrary } from "@/components/brand/AssetLibrary";

const WIZARD_STORAGE_KEY = "adlynx_wizard";
const UGC_POLL_INTERVAL_MS = 5_000;
const UGC_POLL_TIMEOUT_MS = 180_000; // 3 minutes; Veo typically takes 60–120s

type Step = "hero" | "scanning" | "details" | "profile" | "products" | "ads";

type UgcResult = {
  prompt?: unknown;
  video?: { url?: string; jobId?: string };
};

type AdType = "facebook" | "instagram-story";
type GeneratedAd = { type: AdType; imageUrl: string; caption: string; imageBase64?: string };

type PersistedWizardState = {
  step: Step;
  scanResult: ScanResult | null;
  brandName: string;
  sellingType: string;
  logoUrl: string;
  tagline: string;
  colors: { primary: string; secondary: string; accent: string };
  mission: string;
  products: Product[];
  allImages: string[];
  ugcResult: UgcResult | null;
  videoGenerationEnabled: boolean;
  generatedAds: { ads: Array<{ type?: AdType; imageUrl?: string; caption: string; imageBase64?: string }> } | null;
  adsetStrategy: { strategy: AdsetStrategy } | null;
};

function base64ToBlobUrl(b64: string): string {
  try {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: "image/png" }));
  } catch {
    return "";
  }
}

/* ── Tiny icons used in hero ── */
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

/* ── Color swatch with picker ── */
function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="h-10 w-10 shrink-0 rounded-xl border-2 border-gray-200 transition hover:border-brand-300"
        style={{ backgroundColor: value || "#e5e7eb" }}
      />
      <input
        ref={ref}
        type="color"
        value={value || "#cccccc"}
        onChange={(e) => onChange(e.target.value)}
        className="invisible absolute h-0 w-0"
      />
      <div>
        <p className="text-[13px] font-medium text-gray-600">{label}</p>
        <p className="font-mono text-[12px] text-gray-400">{value || "Not detected"}</p>
      </div>
    </div>
  );
}

/* ── Scan loading animation ── */
const SCAN_PHASES = [
  { label: "Connecting to website", short: "Website" },
  { label: "Extracting brand name", short: "Name" },
  { label: "Finding your logo", short: "Logo" },
  { label: "Reading tagline & copy", short: "Tagline" },
  { label: "Detecting brand colors", short: "Colors" },
  { label: "Analyzing niche & market", short: "Niche" },
  { label: "Scanning images & assets", short: "Images" },
  { label: "Discovering products", short: "Products" },
  { label: "Generating brand mission", short: "Mission" },
  { label: "Wrapping up", short: "Done" },
];

const RING_CIRCUMFERENCE = 2 * Math.PI * 90;
const PHASE_COUNT = SCAN_PHASES.length;

function ScanLoader({ scanDone }: { scanDone: boolean }) {
  const [activePhase, setActivePhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (scanDone) {
      setActivePhase(PHASE_COUNT);
      return;
    }
    const interval = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        const phase = Math.min(Math.floor((next / 4.5)), PHASE_COUNT - 1);
        setActivePhase(phase);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [scanDone]);

  const progress = scanDone ? 1 : Math.min(activePhase / PHASE_COUNT, 0.95);
  const strokeDash = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-14">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="orb absolute -left-20 top-1/4 h-[350px] w-[350px] rounded-full bg-brand-200/30 blur-[100px]" />
        <div className="orb orb-delay absolute -right-20 bottom-1/4 h-[300px] w-[300px] rounded-full bg-indigo-200/20 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg">
        {/* SVG progress ring with central icon */}
        <div className="relative mx-auto mb-10 h-[200px] w-[200px]">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="3" opacity="0.5" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke="url(#scan-gradient)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDash}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Rotating sweep line */}
          <div className="absolute inset-0 scan-sweep">
            <div className="mx-auto h-1/2 w-px origin-bottom bg-gradient-to-t from-brand-500/40 to-transparent" />
          </div>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-brand-600">
              {Math.round(progress * 100)}%
            </span>
            <span className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-gray-400">
              Extracting
            </span>
          </div>

          {/* Orbiting nodes around the ring */}
          {SCAN_PHASES.map((phase, i) => {
            const angle = (i / PHASE_COUNT) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 100 + 90 * Math.cos(rad);
            const y = 100 + 90 * Math.sin(rad);
            const done = i < activePhase || scanDone;
            const active = i === activePhase && !scanDone;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${(x / 200) * 100}%`,
                  top: `${(y / 200) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-500 ${
                  done
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/30 scale-100"
                    : active
                    ? "bg-white text-brand-600 ring-2 ring-brand-400 shadow-lg shadow-brand-500/20 scale-110"
                    : "bg-gray-100 text-gray-400 scale-90"
                }`}>
                  {done ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active phase label */}
        <div className="mb-8 text-center">
          <p key={activePhase} className="scan-phase-text text-[17px] font-semibold text-gray-900">
            {activePhase < PHASE_COUNT
              ? SCAN_PHASES[activePhase].label
              : "Almost done..."}
          </p>
          <p className="mt-1.5 text-[13px] text-gray-400">
            Building your brand profile
          </p>
        </div>

        {/* Mini pill timeline */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SCAN_PHASES.map((phase, i) => {
            const done = i < activePhase || scanDone;
            const active = i === activePhase && !scanDone;
            return (
              <div
                key={i}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-500 ${
                  done
                    ? "bg-brand-50 text-brand-600"
                    : active
                    ? "bg-white text-brand-700 shadow-md ring-1 ring-brand-200"
                    : "bg-gray-100/60 text-gray-400"
                }`}
              >
                {done && (
                  <svg className="h-3 w-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {active && (
                  <span className="block h-3 w-3 animate-spin rounded-full border-[1.5px] border-brand-200 border-t-brand-600" />
                )}
                {phase.short}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════ */
/* ────────── Page root ──────── */
/* ══════════════════════════════ */
export default function Home() {
  /* ── Wizard state ── */
  const [step, setStep] = useState<Step>("hero");
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  /* ── Editable fields (populated from scanResult) ── */
  const [brandName, setBrandName] = useState("");
  const [sellingType, setSellingType] = useState<"products" | "saas" | "services" | "">("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoStoragePath, setLogoStoragePath] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [tagline, setTagline] = useState("");
  const [colors, setColors] = useState({ primary: "", secondary: "", accent: "" });
  const [mission, setMission] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);

  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [ugcLoading, setUgcLoading] = useState(false);
  const [ugcError, setUgcError] = useState<string | null>(null);
  const [ugcResult, setUgcResult] = useState<UgcResult | null>(null);
  const [videoGenerationEnabled, setVideoGenerationEnabled] = useState(true);

  const [generatedAds, setGeneratedAds] = useState<{ ads: GeneratedAd[]; loading?: boolean; error?: string } | null>(null);
  const [adsetStrategy, setAdsetStrategy] = useState<{ strategy: AdsetStrategy | null; loading: boolean; error?: string } | null>(null);
  const [adCarouselIndex, setAdCarouselIndex] = useState(0);
  const [videoMuted, setVideoMuted] = useState(true);

  const pathname = usePathname();
  const hasRestoredRef = useRef(false);
  const ugcTriggeredRef = useRef(false);
  const adsTriggeredRef = useRef(false);
  const ugcVideoRef = useRef<HTMLVideoElement>(null);

  /* Restore wizard state from sessionStorage on mount (only on /) */
  useEffect(() => {
    if (typeof window === "undefined" || pathname !== "/" || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as PersistedWizardState;
      if (data.step && data.step !== "hero" && data.step !== "scanning") {
        setStep(data.step);
        if (data.scanResult) setScanResult(data.scanResult);
        if (data.brandName != null) setBrandName(data.brandName);
        if (data.sellingType != null) setSellingType(data.sellingType === "products" || data.sellingType === "saas" || data.sellingType === "services" ? data.sellingType : "");
        if (data.logoUrl != null) {
          setLogoUrl(data.logoUrl);
          setLogoPreview(data.logoUrl);
        }
        if (data.tagline != null) setTagline(data.tagline);
        if (data.colors) setColors(data.colors);
        if (data.mission != null) setMission(data.mission);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.allImages)) setAllImages(data.allImages);
        if (data.ugcResult != null) {
          const u = data.ugcResult as UgcResult & { veo?: { url?: string; jobId?: string }; sora?: { url?: string; jobId?: string } };
          const normalized: UgcResult = {
            prompt: u.prompt,
            video: u.video ?? (u.sora ? { url: u.sora.url, jobId: u.sora.jobId } : undefined),
          };
          setUgcResult(normalized);
          ugcTriggeredRef.current = true;
        }
        if (typeof data.videoGenerationEnabled === "boolean") setVideoGenerationEnabled(data.videoGenerationEnabled);
        if (data.generatedAds?.ads?.length) {
          const ads: GeneratedAd[] = data.generatedAds.ads.map((a: { type?: AdType; imageUrl?: string; caption: string; imageBase64?: string }) => {
            const adType: AdType = a.type || "facebook";
            const imageUrl = a.imageBase64 ? base64ToBlobUrl(a.imageBase64) : (a.imageUrl || "");
            return { type: adType, imageUrl, caption: a.caption, imageBase64: a.imageBase64 };
          });
          setGeneratedAds({ ads });
          adsTriggeredRef.current = true;
        }
        if (data.adsetStrategy?.strategy) {
          setAdsetStrategy({ strategy: data.adsetStrategy.strategy as AdsetStrategy, loading: false });
        }
      }
    } catch {
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
    }
  }, [pathname]);

  /* Persist wizard state so refresh keeps the user on the same step */
  useEffect(() => {
    if (typeof window === "undefined" || pathname !== "/") return;
    if (step === "hero" || step === "scanning") return;
    try {
      const payload: PersistedWizardState = {
        step,
        scanResult,
        brandName,
        sellingType,
        logoUrl,
        tagline,
        colors,
        mission,
        products,
        allImages,
        ugcResult: ugcResult
          ? { prompt: ugcResult.prompt, video: ugcResult.video ? { url: ugcResult.video.url, jobId: ugcResult.video.jobId } : undefined }
          : null,
        videoGenerationEnabled,
        generatedAds: generatedAds?.ads?.length
          ? { ads: generatedAds.ads.map((a) => ({ type: a.type, caption: a.caption, imageBase64: a.imageBase64 })) }
          : null,
        adsetStrategy: adsetStrategy?.strategy ? { strategy: adsetStrategy.strategy } : null,
      };
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
    }
  }, [pathname, step, scanResult, brandName, sellingType, logoUrl, tagline, colors, mission, products, allImages, ugcResult, videoGenerationEnabled, generatedAds, adsetStrategy]);

  /* Poll Sora video job */
  useEffect(() => {
    const jobId = ugcResult?.video?.jobId;
    if (!jobId || ugcResult?.video?.url) return;
    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start > UGC_POLL_TIMEOUT_MS) { clearInterval(id); return; }
      try {
        const res = await fetch(`/api/ugc/testimonial/status?jobId=${encodeURIComponent(jobId)}`);
        const data = await res.json();
        if (data.status === "completed" && data.video) {
          setUgcResult((prev) => prev ? { ...prev, video: { ...prev.video, ...data.video } } : null);
          clearInterval(id);
        }
      } catch { /* ignore */ }
    }, UGC_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ugcResult?.video?.jobId, ugcResult?.video?.url]);

  /* Scroll to top when entering products or ads step */
  useEffect(() => {
    if (step === "products" || step === "ads") window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  /* Populate editable fields when scan completes */
  useEffect(() => {
    if (!scanResult) return;
    setBrandName(scanResult.businessName || "");
    setSellingType(scanResult.sellingType || "");
    setLogoUrl(scanResult.logoUrl || "");
    setLogoPreview(scanResult.logoUrl || "");
    setLogoStoragePath("");
    setTagline(scanResult.tagline || "");
    setColors({
      primary: scanResult.colors.primary || "",
      secondary: scanResult.colors.secondary || "",
      accent: scanResult.colors.accent || "",
    });
    setMission(scanResult.mission || "");
    setProducts(scanResult.products || []);
    setAllImages(scanResult.allImages || []);
  }, [scanResult]);

  /* ── Logo file upload ── */
  const handleLogoFile = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLogoUrl(data.url);
      setLogoStoragePath(data.storagePath || "");
    } catch {
      setLogoUrl("");
      setLogoStoragePath("");
    } finally {
      setLogoUploading(false);
    }
  }, []);

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleLogoFile(file);
  }, [handleLogoFile]);

  const handleLogoRemove = useCallback(() => {
    setLogoPreview("");
    setLogoUrl("");
    setLogoStoragePath("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  }, []);

  /* ── Submit URL ── */
  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setScanError(null);
    setScanResult(null);
    setScanning(true);
    setStep("scanning");

    try {
      const res = await fetch("/api/scan/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScanResult(data.scanResult);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Something went wrong");
      setStep("hero");
    } finally {
      setScanning(false);
    }
  }

  /* Auto-transition from scanning to details when scan completes */
  useEffect(() => {
    if (step === "scanning" && scanResult && !scanning) {
      const timer = setTimeout(() => setStep("details"), 800);
      return () => clearTimeout(timer);
    }
  }, [step, scanResult, scanning]);

  async function handleContinueToDashboard() {
    if (!scanResult) return;
    setBootstrapError(null);
    setBootstrapLoading(true);
    try {
      const res = await fetch("/api/workspace/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: scanResult.websiteUrl,
          domain: scanResult.domain,
          profile: {
            businessName: brandName,
            tagline: tagline || null,
            mission: mission || null,
            sellingType: sellingType || null,
            colors,
            socialLinks: scanResult.socialLinks ?? null,
            logoUrl: logoUrl || null,
            logoStoragePath: logoStoragePath || null,
          },
          products: products.map((p) => ({
            externalId: p.id || null,
            title: p.title,
            description: p.description || null,
            url: p.url || null,
            vendor: p.vendor || null,
            price: p.price || null,
            images: p.images || [],
          })),
          allImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save workspace");
      const workspaceId = data.workspaceId;
      if (workspaceId) window.location.href = `/app?workspaceId=${encodeURIComponent(workspaceId)}`;
      else throw new Error("No workspace ID returned");
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBootstrapLoading(false);
    }
  }

  /* ── Auto-trigger UGC video (Sora 2 Pro) as soon as scan completes, only if enabled ── */
  useEffect(() => {
    if (ugcTriggeredRef.current) return;
    if (!scanResult?.businessName?.trim()) return;
    ugcTriggeredRef.current = true;

    if (!videoGenerationEnabled) return;

    const first = scanResult.products?.[0];
    const name = scanResult.businessName.trim();
    (async () => {
      setUgcLoading(true);
      setUgcError(null);
      try {
        const res = await fetch("/api/ugc/testimonial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: {
              name,
              tagline: scanResult.tagline || undefined,
              mission: scanResult.mission || undefined,
              colors: scanResult.colors,
              websiteUrl: scanResult.websiteUrl,
              domain: scanResult.domain,
            },
            product: first
              ? { title: first.title, description: first.description || undefined, imageUrl: first.images?.[0] || undefined }
              : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "UGC generation failed");
        setUgcResult({ prompt: data.prompt, video: data.video });
      } catch (err) {
        setUgcError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setUgcLoading(false);
      }
    })();
  }, [scanResult, videoGenerationEnabled]);

  /* ── Auto-trigger Facebook ad + IG story ad + ad set strategy when we have products ── */
  useEffect(() => {
    if (adsTriggeredRef.current) return;
    const first = products?.[0] ?? scanResult?.products?.[0];
    if (!scanResult?.businessName?.trim() || !first) return;
    adsTriggeredRef.current = true;

    const brandPayload = {
      name: scanResult.businessName.trim(),
      tagline: scanResult.tagline || undefined,
      colors: scanResult.colors || undefined,
      mission: scanResult.mission || undefined,
      sellingType: scanResult.sellingType || undefined,
      websiteUrl: scanResult.websiteUrl,
      domain: scanResult.domain,
    };
    const adBody = { brand: { ...brandPayload }, product: { title: first.title, description: first.description || undefined } };

    setGeneratedAds((prev) => (prev ? { ...prev, loading: true, error: undefined } : { ads: [], loading: true }));
    setAdsetStrategy((prev) => (prev ? { ...prev, loading: true, error: undefined } : { strategy: null, loading: true }));

    (async () => {
      const [fbRes, igRes, strategyRes] = await Promise.all([
        fetch("/api/ads/facebook-ad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adBody) }),
        fetch("/api/ads/instagram-story-ad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adBody) }),
        fetch("/api/ads/adset-strategy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: brandPayload, product: { title: first.title, description: first.description || undefined, price: first.price } }) }),
      ]);

      const [fbData, igData, strategyData] = await Promise.all([fbRes.json(), igRes.json(), strategyRes.json()]);

      const ads: GeneratedAd[] = [];
      if (fbRes.ok && fbData.imageBase64) {
        const imageUrl = base64ToBlobUrl(fbData.imageBase64);
        ads.push({ type: "facebook", imageUrl, caption: fbData.caption || "", imageBase64: fbData.imageBase64 });
      }
      if (igRes.ok && igData.imageBase64) {
        const imageUrl = base64ToBlobUrl(igData.imageBase64);
        ads.push({ type: "instagram-story", imageUrl, caption: igData.caption || "", imageBase64: igData.imageBase64 });
      }

      if (ads.length > 0) {
        setGeneratedAds({ ads, loading: false });
      } else {
        setGeneratedAds((prev) => ({
          ads: prev?.ads ?? [],
          loading: false,
          error: fbData.error || igData.error || "Ad generation failed",
        }));
      }

      if (strategyRes.ok && strategyData.strategy) {
        setAdsetStrategy({ strategy: strategyData.strategy as AdsetStrategy, loading: false });
      } else {
        setAdsetStrategy((prev) => ({
          strategy: prev?.strategy ?? null,
          loading: false,
          error: strategyData.error || "Strategy generation failed",
        }));
      }
    })();
  }, [scanResult, products]);

  /* ── Step indicator ── */
  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "profile", label: "Brand" },
    { key: "products", label: "Products" },
    { key: "ads", label: "Ads" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="fixed top-0 z-50 w-full border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a
              href="/"
              onClick={() => {
                setStep("hero");
                setScanResult(null);
                setScanError(null);
                if (typeof window !== "undefined") sessionStorage.removeItem(WIZARD_STORAGE_KEY);
              }}
              className="flex items-center gap-2"
            >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">AdLynx</span>
          </a>

          {/* Step indicator (only shown when in wizard, not during scanning) */}
          {step !== "hero" && step !== "scanning" && (
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (i <= stepIndex || scanResult) setStep(s.key);
                    }}
                    disabled={i > stepIndex && !scanResult}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                      step === s.key
                        ? "bg-brand-600 text-white"
                        : i < stepIndex || scanResult
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-50 text-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                  {i < steps.length - 1 && (
                    <div className={`mx-1 h-px w-4 ${i < stepIndex ? "bg-brand-300" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {step === "hero" && (
            <a href="#try" className="rounded-full bg-gray-900 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-gray-800">
              Try it free
            </a>
          )}
        </div>
      </header>

      {/* ═══════════════════════════ */}
      {/* ────── STEP: Hero ──────── */}
      {/* ═══════════════════════════ */}
      {step === "hero" && (
        <section id="try" className="hero-grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-14">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="orb absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-brand-200/40 blur-[120px]" />
            <div className="orb orb-delay absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-indigo-200/30 blur-[100px]" />
            <div className="orb orb-delay-2 absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-violet-100/40 blur-[80px]" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
            <div className="animate-fade-in flex items-center justify-center gap-3">
              {[
                { Icon: MetaIcon, color: "text-[#1877F2]", name: "Meta" },
                { Icon: GoogleIcon, color: "", name: "Google" },
                { Icon: TikTokIcon, color: "text-gray-900", name: "TikTok" },
                { Icon: InstagramIcon, color: "text-[#E4405F]", name: "Instagram" },
              ].map(({ Icon, color, name }) => (
                <div key={name} className="flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-3 py-1 shadow-sm">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-[12px] font-medium text-gray-500">{name}</span>
                </div>
              ))}
            </div>
            <h1 className="animate-fade-up mt-8 text-balance text-4xl font-bold leading-[1.12] tracking-tight text-gray-900 sm:text-5xl md:text-[3.5rem]">
              Paste your URL.
              <br />
              Get <span className="font-serif italic text-brand-600">performance ads</span> in minutes.
            </h1>
            <form onSubmit={handleScan} className="animate-fade-up mx-auto mt-10 w-full max-w-xl" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-900/[0.04] transition-all focus-within:border-brand-300 focus-within:shadow-brand-500/[0.08] focus-within:ring-4 focus-within:ring-brand-50">
                <div className="pl-3 text-gray-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="yourwebsite.com"
                  className="flex-1 bg-transparent py-2.5 pl-1 text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Scan website
                </button>
              </div>
              <label className="animate-fade-up mt-4 flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-gray-200/80 bg-white/80 px-4 py-3 shadow-sm transition hover:bg-gray-50/80" style={{ animationDelay: "0.22s" }}>
                <input
                  type="checkbox"
                  checked={videoGenerationEnabled}
                  onChange={(e) => setVideoGenerationEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-[14px] font-medium text-gray-700">Generate AI video ad (Sora 2 Pro) after scan</span>
              </label>
              {scanError && <p className="mt-3 text-sm font-medium text-red-500">{scanError}</p>}
            </form>
            <div className="animate-fade-up mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-gray-400" style={{ animationDelay: "0.3s" }}>
              {["No sign-up required", "Brand kit in seconds", "ROAS-optimised creative"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════ */}
      {/* ────── STEP: Details ────────── */}
      {/* ═══════════════════════════════ */}
      {/* ═══════════════════════════════════ */}
      {/* ────── STEP: Scanning ──────────── */}
      {/* ═══════════════════════════════════ */}
      {step === "scanning" && (
        <ScanLoader scanDone={!!scanResult} />
      )}

      {/* ═══════════════════════════════ */}
      {/* ────── STEP: Details ────────── */}
      {/* ═══════════════════════════════ */}
      {step === "details" && (
        <section className="flex min-h-screen items-center justify-center px-6 pt-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Tell us about your brand</h2>
              <p className="mt-2 text-[15px] text-gray-500">Confirm your details below.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Brand name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Your brand name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">What are you selling?</label>
                <select
                  value={sellingType}
                  onChange={(e) => setSellingType(e.target.value as typeof sellingType)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
                >
                  <option value="">Select...</option>
                  <option value="products">Products</option>
                  <option value="saas">SaaS / Digital</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={!brandName.trim() || !sellingType}
              onClick={() => setStep("profile")}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              Continue
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </section>
      )}

      {/* ════════════════════════════════ */}
      {/* ────── STEP: Profile ────────── */}
      {/* ════════════════════════════════ */}
      {step === "profile" && (
        <section className="min-h-screen px-6 pb-12 pt-24">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Your brand profile</h2>
              <p className="mt-1 text-[15px] text-gray-500">Review and edit what we extracted.</p>
            </div>
            <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              {/* Logo Upload */}
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-gray-700">Logo</label>
                {logoPreview ? (
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-1" />
                      {logoUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                          <svg className="h-5 w-5 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-red-500 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleLogoDrop}
                    onClick={() => logoInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 transition hover:border-brand-300 hover:bg-brand-50/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-medium text-gray-600">
                      Click to upload <span className="text-gray-400">or drag and drop</span>
                    </p>
                    <p className="text-[11px] text-gray-400">PNG, JPG, SVG or WebP (max 2 MB)</p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoFile(f);
                  }}
                />
              </div>
              {/* Name */}
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Business name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
                />
              </div>
              {/* Tagline */}
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Your brand tagline"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
                />
              </div>
              {/* Colors */}
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-gray-700">Brand colors</label>
                <div className="grid grid-cols-3 gap-4">
                  <ColorSwatch label="Primary" value={colors.primary} onChange={(v) => setColors((c) => ({ ...c, primary: v }))} />
                  <ColorSwatch label="Secondary" value={colors.secondary} onChange={(v) => setColors((c) => ({ ...c, secondary: v }))} />
                  <ColorSwatch label="Accent" value={colors.accent} onChange={(v) => setColors((c) => ({ ...c, accent: v }))} />
                </div>
              </div>
              {/* Mission */}
              <div>
                <label className="mb-1 block text-[14px] font-semibold text-gray-700">Mission</label>
                <textarea
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={3}
                  placeholder="Your brand mission..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-gray-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep("products")}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Continue to Products
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════ */}
      {/* ────── STEP: Products ─────────── */}
      {/* ═══════════════════════════════════ */}
      {step === "products" && (() => {
        const adCount = generatedAds?.ads?.length ?? 0;
        const adLoading = generatedAds?.loading === true;
        const ugcCount = videoGenerationEnabled && ugcResult?.video?.url ? 1 : 0;
        const ugcPending = videoGenerationEnabled && !ugcResult?.video?.url && (ugcLoading || ugcResult?.video?.jobId);
        const summary =
          adLoading || ugcPending
            ? `Generating ${adLoading && ugcPending ? "ads and 1 UGC video" : adLoading ? "ads" : "1 UGC video"}…`
            : `${adCount} Ad${adCount !== 1 ? "s" : ""} and ${ugcCount} UGC video${ugcCount !== 1 ? "s" : ""} generated`;
        return (
        <section className="min-h-screen overflow-x-hidden px-6 pb-12 pt-24">
          <div className="mx-auto max-w-6xl min-w-0">
            {/* Products */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Products</h2>
              <p className="mt-1 text-[15px] text-gray-500">
                {products.length > 0
                  ? `We found ${products.length} product${products.length === 1 ? "" : "s"} on your website.`
                  : "No products were auto-detected. Add them manually below."}
              </p>
              {(adCount > 0 || ugcCount > 0 || adLoading || ugcPending) && (
                <p className="mt-2 text-[14px] font-medium text-brand-600">{summary}</p>
              )}
            </div>
            <ProductListPanel products={products} onProductsChange={setProducts} />

            {/* Asset library */}
            <div className="mt-12">
              <h3 className="text-xl font-bold tracking-tight text-gray-900">Asset library</h3>
              <p className="mt-1 mb-4 text-[15px] text-gray-500">
                All images extracted from your website.
              </p>
              <AssetLibrary images={allImages} />
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep("ads")}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]"
              >
                Generate Ads
              </button>
            </div>
          </div>
        </section>
        );
      })()}

      {/* ═══════════════════════════════════ */}
      {/* ────── STEP: Ads ────────────────── */}
      {/* ═══════════════════════════════════ */}
      {step === "ads" && (() => {
        const videoSkipped = !videoGenerationEnabled;
        const videoReady = !!ugcResult?.video?.url;
        const videoPending = !videoReady && !!(ugcLoading || ugcResult?.video?.jobId);
        const subtitle = videoSkipped
          ? "You chose not to generate a video. Continue to the dashboard to manage your workspace."
          : ugcLoading
            ? "Generating your UGC testimonial video — this usually takes 1–2 minutes…"
            : videoReady
              ? "Here's your AI-generated UGC testimonial ad (Sora 2 Pro)."
              : videoPending
                ? "Video is being generated — it will appear automatically…"
                : ugcError
                  ? "Something went wrong generating the video."
                  : "Preparing your ad creative…";
        const downloadIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

        return (
          <section className="min-h-screen overflow-x-hidden px-6 pb-12 pt-24">
            <div className="mx-auto max-w-5xl min-w-0">
              <div className="mb-10 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">{videoSkipped ? "Generate Ads" : "Your AI-Generated Ad"}</h2>
                <p className="mt-1 text-[15px] text-gray-500">{subtitle}</p>
              </div>

              {!videoSkipped && ugcError && (
                <div className="mx-auto mb-8 max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-[14px] font-medium text-red-700">{ugcError}</p>
                </div>
              )}

              {/* ── Ad carousel: each slide = mockup + strategy (two columns) ── */}
              {(() => {
                const ads = generatedAds?.ads ?? [];
                const loading = generatedAds?.loading;
                const adError = generatedAds?.error;
                const currentAd = ads[adCarouselIndex];
                const strategy = adsetStrategy?.strategy ?? null;
                const strategyLoading = adsetStrategy?.loading === true;
                const strategyError = adsetStrategy?.error;
                const totalSlides = ads.length + (videoSkipped ? 0 : 1);
                const isVideoSlide = !videoSkipped && adCarouselIndex === ads.length;
                const slideLabel = isVideoSlide
                  ? "UGC video"
                  : currentAd?.type === "instagram-story"
                    ? "Instagram story ad"
                    : "Facebook ad";
                const logoSrc = logoPreview || logoUrl || "";

                const fbMockup = (ad: GeneratedAd) => (
                  <div className="relative mx-auto w-[290px] flex-shrink-0 rounded-[3rem] border-[6px] border-gray-900 bg-gray-900 p-2 shadow-2xl">
                    <div className="absolute top-0 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
                    <div className="relative overflow-hidden rounded-[2.4rem] bg-white" style={{ aspectRatio: "9/19.5" }}>
                      <div className="absolute inset-0 z-10 flex flex-col bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-3 pt-2 pb-0.5 text-[9px] font-semibold text-gray-900"><span>9:41</span><div className="flex items-center gap-1"><svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div></div>
                        <div className="flex items-center border-b border-gray-200 px-3 py-1"><span className="text-[16px] font-bold text-[#1877F2]">facebook</span></div>
                        <div className="flex flex-1 flex-col min-h-0">
                          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                            <div className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">{logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-cover" /> : <span className="text-white text-[11px] font-bold bg-gradient-to-br from-brand-400 to-brand-600 w-full h-full flex items-center justify-center">{(brandName || "A")[0].toUpperCase()}</span>}</div>
                            <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">{brandName || "Brand"}</p><p className="text-[10px] text-gray-500 leading-tight">Sponsored · <svg className="inline h-2.5 w-2.5 text-gray-400 -mt-px" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></p></div>
                            <span className="text-gray-400 text-sm leading-none">⋯</span>
                          </div>
                          <div className="px-3 pb-1 flex-shrink-0"><p className="text-[11px] text-gray-900 leading-snug">{ad.caption}</p></div>
                          <div className="flex-1 min-h-0 bg-gray-100">{ad.imageUrl ? <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-400 text-[11px]">Image</div>}</div>
                          <div className="flex items-center justify-between px-3 py-0.5 text-[10px] text-gray-500"><span className="flex items-center gap-0.5"><span className="text-blue-600">👍</span> 400</span><span>210 Shares</span></div>
                          <div className="h-px bg-gray-200 mx-3" />
                          <div className="grid grid-cols-3 text-[10px] font-semibold text-gray-600">
                            <button type="button" className="py-1.5 flex items-center justify-center gap-1 hover:bg-gray-50"><svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L15.17 1 7.59 8.59C7.22 8.95 7 9.45 7 10v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg> Like</button>
                            <button type="button" className="py-1.5 flex items-center justify-center gap-1 hover:bg-gray-50"><svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg> Comment</button>
                            <button type="button" className="py-1.5 flex items-center justify-center gap-1 hover:bg-gray-50"><svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg> Share</button>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 pb-2 pt-0.5"><button type="button" className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-[#1877F2] py-1.5 text-[11px] font-semibold text-white">ℹ️ Learn More</button><button type="button" className="rounded-md border border-gray-300 px-1.5 py-1.5 text-gray-500 text-[11px]" aria-label="More">⋯</button></div>
                        </div>
                      </div>
                    </div>
                    <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-600" />
                  </div>
                );

                const igStoryMockup = (ad: GeneratedAd) => (
                  <div className="relative mx-auto w-[290px] flex-shrink-0 rounded-[3rem] border-[6px] border-gray-900 bg-gray-900 p-2 shadow-2xl">
                    <div className="absolute top-0 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
                    <div className="relative overflow-hidden rounded-[2.4rem] bg-black" style={{ aspectRatio: "9/19.5" }}>
                      {ad.imageUrl && <img src={ad.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
                        {/* Status bar */}
                        <div className="flex items-center justify-between px-4 pt-3 text-[9px] font-semibold text-white">
                          <span>13:34</span>
                          <div className="flex items-center gap-1"><svg className="h-2.5 w-2.5" fill="white" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg><svg className="h-2.5 w-2.5" fill="white" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg></div>
                        </div>
                        {/* Story progress bar */}
                        <div className="mx-3 mt-1 h-0.5 rounded-full bg-white/30"><div className="h-full w-1/3 rounded-full bg-white" /></div>
                        {/* Profile row + close */}
                        <div className="flex items-center justify-between px-3 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">{logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-cover" /> : <span className="text-[9px] font-bold text-white">{(brandName || "A")[0].toUpperCase()}</span>}</div>
                            <div><p className="text-[11px] font-semibold text-white drop-shadow leading-tight">{brandName || "Brand"}</p><p className="text-[9px] text-white/70">Sponsored</p></div>
                          </div>
                          <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        {/* Spacer */}
                        <div className="flex-1" />
                        {/* Caption overlay */}
                        <div className="px-4 pb-2">
                          <p className="text-[13px] font-bold text-white drop-shadow leading-snug">{ad.caption}</p>
                        </div>
                        {/* CTA: Shop Now */}
                        <div className="flex items-center justify-between px-4 pb-4">
                          <div className="flex flex-1 items-center justify-center gap-1.5">
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                            <span className="text-[12px] font-semibold text-white">Shop Now</span>
                          </div>
                          <span className="text-white/60 text-sm">⋯</span>
                        </div>
                      </div>
                    </div>
                    <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-600" />
                  </div>
                );

                const strategyPanel = (
                  <div className="w-full flex-1 lg:max-w-md">
                    <h3 className="mb-3 text-lg font-semibold text-gray-900">Ad set strategy</h3>
                    {strategyLoading && !strategy && (<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /><p className="text-[13px] text-gray-500">Generating strategy…</p></div>)}
                    {strategyError && !strategy && (<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">{strategyError}</div>)}
                    {strategy && (
                      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-[12px] font-semibold text-brand-700">Campaign: {strategy.campaignObjective}</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium text-gray-700">Optimize: {strategy.optimizationGoal}</span>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Target audience</p>
                          <p className="text-[13px] text-gray-700">Ages {strategy.targetAudience?.ageMin ?? 18}–{strategy.targetAudience?.ageMax ?? 65}{strategy.targetAudience?.genders?.length ? ` · ${strategy.targetAudience.genders.join(", ")}` : ""}</p>
                          {((strategy.targetAudience?.interests?.length ?? 0) > 0 || (strategy.targetAudience?.behaviors?.length ?? 0) > 0) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(strategy.targetAudience.interests ?? []).map((item, idx) => (<span key={idx} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{item}</span>))}
                              {(strategy.targetAudience.behaviors ?? []).map((b, idx) => (<span key={`b-${idx}`} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{b}</span>))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Locations</p>
                          <div className="flex flex-wrap gap-1.5">{(strategy.locations ?? []).map((loc, idx) => (<span key={idx} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[12px] text-gray-700">{loc}</span>))}</div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Placements</p>
                          <div className="flex flex-wrap gap-1.5">{(strategy.placements ?? []).map((pl, idx) => (<span key={idx} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] font-medium text-brand-700">{pl}</span>))}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[13px]">
                          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Daily budget</p><p className="font-medium text-gray-800">{strategy.dailyBudget}</p></div>
                          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Schedule</p><p className="font-medium text-gray-800">{strategy.schedule}</p></div>
                          <div className="col-span-2"><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Bid strategy</p><p className="font-medium text-gray-800">{strategy.bidStrategy}</p></div>
                        </div>
                        <div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ideal customer</p><p className="text-[13px] leading-snug text-gray-700">{strategy.icp}</p></div>
                        {strategy.rationale && (<p className="border-t border-gray-100 pt-3 text-[12px] italic text-gray-500">{strategy.rationale}</p>)}
                      </div>
                    )}
                  </div>
                );

                const videoMockup = (
                  <div className="relative mx-auto w-[290px] flex-shrink-0 rounded-[3rem] border-[6px] border-gray-900 bg-gray-900 p-2 shadow-2xl">
                    <div className="absolute top-0 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
                    <div className="relative overflow-hidden rounded-[2.4rem] bg-black" style={{ aspectRatio: "9/19.5" }}>
                      {videoReady ? (
                        <video ref={ugcVideoRef} autoPlay loop muted={videoMuted} playsInline src={ugcResult!.video!.url} className="absolute inset-0 h-full w-full object-cover" />
                      ) : videoPending ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                          <p className="text-center text-[13px] text-white/60">{ugcLoading ? "Creating…" : "Rendering…"}</p>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center p-6">
                          <p className="text-center text-[13px] text-white/40">—</p>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between">
                        <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-white">
                          <span>9:41</span>
                          <div className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="white" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                            <svg className="h-3 w-3" fill="white" viewBox="0 0 24 24"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-4 -mt-1">
                          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
                              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                              <span className="text-[9px] font-semibold text-white">Create</span>
                            </div>
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 ring-2 ring-white/30" />
                          </div>
                        </div>
                        <div className="flex-1" />
                        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21h4V9H2v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L15.17 1 7.59 8.59C7.22 8.95 7 9.45 7 10v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                            </div>
                            <span className="text-[10px] font-bold text-white drop-shadow">22K</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                            </div>
                            <span className="text-[10px] font-bold text-white drop-shadow">780</span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                            </div>
                            <span className="text-[10px] font-bold text-white drop-shadow">52</span>
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                          </div>
                        </div>
                        <div className="px-3 pb-4">
                          <div className="mb-1.5 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 ring-1 ring-white/30 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{(brandName || "A")[0].toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-white drop-shadow">{brandName || "Brand"}</span>
                              <svg className="h-3 w-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                              <span className="text-[11px] text-white/70">·</span>
                              <span className="text-[11px] font-semibold text-white drop-shadow">Follow</span>
                            </div>
                          </div>
                          <div className="mb-1 flex items-center gap-1">
                            <svg className="h-2.5 w-2.5 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            <span className="text-[9px] text-white/60">Public</span>
                          </div>
                          <p className="mb-2 text-[11px] text-white drop-shadow leading-tight">{products[0]?.title ? `Trying out ${products[0].title} ✨` : "This is my moment ✨"}</p>
                          <div className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1.5 backdrop-blur-sm">
                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-[7px] font-bold text-white">{(brandName || "A")[0].toUpperCase()}</span>
                            </div>
                            <span className="text-[9px] text-white/80 truncate flex-1">{brandName || "Brand"} · Original audio</span>
                            <div className="flex items-center gap-px flex-shrink-0">
                              {[3,5,7,4,6,8,5,3,6,4,7,5].map((h, i) => (
                                <div key={i} className="w-[2px] rounded-full bg-white/60" style={{ height: `${h}px` }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      {videoReady && (
                        <button
                          type="button"
                          onClick={() => setVideoMuted((m) => !m)}
                          className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
                          aria-label={videoMuted ? "Unmute" : "Mute"}
                        >
                          {videoMuted ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 8.003 12 8.449 12 9.414v5.172c0 .965-1.077 1.411-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 8.003 12 8.449 12 9.414v5.172c0 .965-1.077 1.411-1.707.707L5.586 15z" /></svg>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-600" />
                  </div>
                );

                return (
                  <div className="mb-10">
                    {adError && (<div className="mx-auto mb-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-[13px] text-amber-800">{adError}</div>)}
                    <div className="mb-4 flex items-center justify-center gap-4">
                      <button type="button" onClick={() => setAdCarouselIndex((i) => Math.max(0, i - 1))} disabled={adCarouselIndex === 0 || totalSlides === 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-30" aria-label="Previous"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">{slideLabel}</h3>
                        {totalSlides > 1 && <p className="text-[12px] text-gray-500">{adCarouselIndex + 1} of {totalSlides}</p>}
                      </div>
                      <button type="button" onClick={() => setAdCarouselIndex((i) => Math.min(totalSlides - 1, i + 1))} disabled={adCarouselIndex >= totalSlides - 1 || totalSlides === 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-30" aria-label="Next"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
                    </div>
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-center">
                      <div className="flex flex-shrink-0 flex-col items-center gap-3">
                        {isVideoSlide ? (
                          <>
                            {videoMockup}
                            {videoReady && (
                              <a href={ugcResult!.video!.url} download="ugc-testimonial.mp4" className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
                                {downloadIcon}
                                Download video
                              </a>
                            )}
                          </>
                        ) : loading && !currentAd ? (
                          <div className="relative mx-auto w-[290px] rounded-[3rem] border-[6px] border-gray-900 bg-gray-900 p-2 shadow-2xl">
                            <div className="absolute top-0 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
                            <div className="relative flex items-center justify-center overflow-hidden rounded-[2.4rem] bg-gray-100" style={{ aspectRatio: "9/19.5" }}>
                              <div className="flex flex-col items-center gap-3"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /><p className="text-[13px] text-gray-500">Generating ads…</p></div>
                            </div>
                            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-600" />
                          </div>
                        ) : currentAd ? (
                          currentAd.type === "instagram-story" ? igStoryMockup(currentAd) : fbMockup(currentAd)
                        ) : (
                          <div className="relative mx-auto w-[290px] rounded-[3rem] border-[6px] border-gray-900 bg-gray-900 p-2 shadow-2xl">
                            <div className="absolute top-0 left-1/2 z-30 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
                            <div className="relative flex items-center justify-center overflow-hidden rounded-[2.4rem] bg-gray-100" style={{ aspectRatio: "9/19.5" }}><p className="text-[13px] text-gray-400">No ad yet</p></div>
                            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-600" />
                          </div>
                        )}
                      </div>
                      {!isVideoSlide && strategyPanel}
                    </div>
                  </div>
                );
              })()}

            </div>
          </section>
        );
      })()}
    </div>
  );
}
