"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Workspace = {
  id: string;
  business_name: string | null;
  tagline: string | null;
  mission: string | null;
  selling_type: string | null;
  colors: { primary?: string | null; secondary?: string | null; accent?: string | null } | null;
  social_links: { platform: string; url: string }[] | null;
  logo_external_url: string | null;
};

export default function DnaPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [mission, setMission] = useState("");
  const [sellingType, setSellingType] = useState("");
  const [colors, setColors] = useState({ primary: "", secondary: "", accent: "" });

  useEffect(() => {
    fetch("/api/workspace/current")
      .then((res) => res.json())
      .then((data) => {
        if (data.error || !data.workspaceId) {
          setError(data.error || "No workspace found");
          return;
        }
        return fetch(`/api/workspace/${data.workspaceId}`).then((r) => r.json());
      })
      .then((w: Workspace | undefined) => {
        if (!w || !w.id) {
          setError("Workspace not found");
          return;
        }
        setWorkspace(w);
        setBusinessName(w.business_name ?? "");
        setTagline(w.tagline ?? "");
        setMission(w.mission ?? "");
        setSellingType(w.selling_type ?? "");
        setColors({
          primary: (w.colors as { primary?: string })?.primary ?? "",
          secondary: (w.colors as { secondary?: string })?.secondary ?? "",
          accent: (w.colors as { accent?: string })?.accent ?? "",
        });
      })
      .catch(() => setError("Failed to load workspace"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!workspace) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/workspace/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim() || null,
          tagline: tagline.trim() || null,
          mission: mission.trim() || null,
          sellingType: sellingType || null,
          colors: { primary: colors.primary || null, secondary: colors.secondary || null, accent: colors.accent || null },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setWorkspace(data);
      setMessage("Saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error || "Workspace not found"}</p>
        <Link href="/app" className="mt-4 inline-block text-[14px] font-medium text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">Brand DNA</h1>
      <div className="max-w-xl space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-[14px] font-semibold text-gray-700">Business name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[14px] font-semibold text-gray-700">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[14px] font-semibold text-gray-700">What you sell</label>
          <select
            value={sellingType}
            onChange={(e) => setSellingType(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
          >
            <option value="">Select...</option>
            <option value="products">Products</option>
            <option value="saas">SaaS / Digital</option>
            <option value="services">Services</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[14px] font-semibold text-gray-700">Mission</label>
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
          />
        </div>
        <div>
          <label className="mb-2 block text-[14px] font-semibold text-gray-700">Brand colors</label>
          <div className="grid grid-cols-3 gap-4">
            {(["primary", "secondary", "accent"] as const).map((key) => (
              <div key={key}>
                <input
                  type="color"
                  value={colors[key] || "#e5e7eb"}
                  onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200"
                />
                <p className="mt-1 text-[12px] text-gray-500 capitalize">{key}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {message && <span className="text-[14px] text-gray-500">{message}</span>}
        </div>
      </div>
    </div>
  );
}
