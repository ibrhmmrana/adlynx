"use client";

import { useState, useEffect } from "react";
import type { Workspace } from "@/lib/db/types";

export default function DnaEditor({ workspace }: { workspace: Workspace }) {
  const [businessName, setBusinessName] = useState(workspace.business_name ?? "");
  const [tagline, setTagline] = useState(workspace.tagline ?? "");
  const [mission, setMission] = useState(workspace.mission ?? "");
  const [sellingType, setSellingType] = useState(workspace.selling_type ?? "");
  const [colors, setColors] = useState(workspace.colors ?? { primary: null, secondary: null, accent: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBusinessName(workspace.business_name ?? "");
    setTagline(workspace.tagline ?? "");
    setMission(workspace.mission ?? "");
    setSellingType(workspace.selling_type ?? "");
    setColors(workspace.colors ?? { primary: null, secondary: null, accent: null });
  }, [workspace]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/workspace/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || null,
          tagline: tagline || null,
          mission: mission || null,
          selling_type: sellingType || null,
          colors: { primary: colors.primary || null, secondary: colors.secondary || null, accent: colors.accent || null },
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-[14px] font-semibold text-gray-700">Business name</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
        />
      </div>
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
      <div>
        <label className="mb-1 block text-[14px] font-semibold text-gray-700">Selling type</label>
        <select
          value={sellingType}
          onChange={(e) => setSellingType(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-50"
        >
          <option value="">Select...</option>
          <option value="products">Products</option>
          <option value="saas">SaaS / Digital</option>
          <option value="services">Services</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-[14px] font-semibold text-gray-700">Brand colors</label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-[12px] text-gray-500">Primary</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colors.primary || "#cccccc"}
                onChange={(e) => setColors((c) => ({ ...c, primary: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={colors.primary || ""}
                onChange={(e) => setColors((c) => ({ ...c, primary: e.target.value || null }))}
                className="flex-1 rounded border border-gray-200 px-2 py-1.5 font-mono text-[12px]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-gray-500">Secondary</label>
            <div className="flex gap-2">
              <input type="color" value={colors.secondary || "#cccccc"} onChange={(e) => setColors((c) => ({ ...c, secondary: e.target.value }))} className="h-10 w-14 cursor-pointer rounded border border-gray-200" />
              <input type="text" value={colors.secondary || ""} onChange={(e) => setColors((c) => ({ ...c, secondary: e.target.value || null }))} className="flex-1 rounded border border-gray-200 px-2 py-1.5 font-mono text-[12px]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-gray-500">Accent</label>
            <div className="flex gap-2">
              <input type="color" value={colors.accent || "#cccccc"} onChange={(e) => setColors((c) => ({ ...c, accent: e.target.value }))} className="h-10 w-14 cursor-pointer rounded border border-gray-200" />
              <input type="text" value={colors.accent || ""} onChange={(e) => setColors((c) => ({ ...c, accent: e.target.value || null }))} className="flex-1 rounded border border-gray-200 px-2 py-1.5 font-mono text-[12px]" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-[13px] text-green-600">Saved</span>}
      </div>
    </div>
  );
}
