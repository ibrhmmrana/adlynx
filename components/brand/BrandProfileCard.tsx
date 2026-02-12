"use client";

import type {
  BrandProfile,
  BrandBasics,
  LogoSystem,
  ColorSystem,
  VoiceAndTone,
  ContentStructure,
  BrandAssets,
} from "@/lib/brand/types";

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "📷",
  facebook: "f",
  linkedin: "in",
  twitter: "𝕏",
  tiktok: "♪",
  youtube: "▶",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function TokenGrid({ tokens }: { tokens: Record<string, string> }) {
  const entries = Object.entries(tokens);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.slice(0, 24).map(([k, v]) => (
        <span
          key={k}
          className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
          title={v}
        >
          {k}: {v.length > 20 ? v.slice(0, 20) + "…" : v}
        </span>
      ))}
      {entries.length > 24 && (
        <span className="text-xs text-slate-400">+{entries.length - 24} more</span>
      )}
    </div>
  );
}

const COLOR_VALUE_REG = /^(#[\da-fA-F]{3,8}|rgb\s*\(|rgba\s*\(|hsl\s*\(|hsla\s*\(|\b(?:white|black|transparent|currentColor)\b)/;
const GRADIENT_REG = /gradient\s*\(/i;

function AssetsVisual({ assets }: { assets: BrandAssets }) {
  const cssVars = assets.cssVariables ?? {};
  const entries = Object.entries(cssVars);
  const trim = (s: string) => s.trim();
  const colorEntries = entries.filter(([, v]) => {
    const t = trim(v);
    return !t.startsWith("var(") && COLOR_VALUE_REG.test(t);
  });
  const gradientEntries = entries.filter(([, v]) => GRADIENT_REG.test(trim(v)));
  const otherEntries = entries.filter(([, v]) => {
    const t = trim(v);
    return !t.startsWith("var(") && !COLOR_VALUE_REG.test(t) && !GRADIENT_REG.test(t);
  });

  const allImageUrls = [
    ...(assets.ogImages ?? []),
    ...(assets.svgLogos ?? []),
    ...(assets.allImages ?? []),
  ];
  const seenUrls = new Set<string>();
  const uniqueImages = allImageUrls.filter((u) => {
    if (seenUrls.has(u)) return false;
    seenUrls.add(u);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Color tokens: swatches */}
      {colorEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Colors</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {colorEntries.map(([name, value]) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <span
                  className="w-full aspect-square max-w-[48px] rounded-lg border border-slate-200 shadow-inner"
                  style={{ backgroundColor: value }}
                  title={`${name}: ${value}`}
                />
                <span className="text-[10px] text-slate-500 truncate w-full text-center" title={name}>
                  {name.replace(/^--/, "").replace(/--/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gradient tokens: swatches */}
      {gradientEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Gradients</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gradientEntries.map(([name, value]) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <span
                  className="w-full aspect-video max-h-16 rounded-lg border border-slate-200"
                  style={{ background: value }}
                  title={`${name}: ${value}`}
                />
                <span className="text-[10px] text-slate-500 truncate w-full text-center" title={name}>
                  {name.replace(/^--/, "").replace(/--/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other tokens (radius, shadow, spacing): minimal visual */}
      {otherEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Other tokens (radius, shadow, spacing)</p>
          <div className="flex flex-wrap gap-3">
            {otherEntries.slice(0, 12).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                {/radius|rounded|border-radius/i.test(name) ? (
                  <span
                    className="w-10 h-10 rounded-lg border-2 border-slate-300 bg-white"
                    style={{ borderRadius: value }}
                    title={`${name}: ${value}`}
                  />
                ) : (
                  <span
                    className="w-10 h-10 rounded border border-slate-200 bg-slate-50"
                    style={/shadow|box-shadow/i.test(name) ? { boxShadow: value } : undefined}
                    title={`${name}: ${value}`}
                  />
                )}
                <span className="text-[10px] text-slate-500 max-w-[80px] truncate" title={name}>{name.replace(/^--/, "")}</span>
              </div>
            ))}
            {otherEntries.length > 12 && (
              <span className="text-xs text-slate-400">+{otherEntries.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {/* Images: grid */}
      {uniqueImages.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Images ({uniqueImages.length})</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {uniqueImages.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Media kit links */}
      {assets.mediaKitUrls && assets.mediaKitUrls.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Media kit / downloads</p>
          <div className="flex flex-wrap gap-2">
            {assets.mediaKitUrls.map((u) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                {new URL(u).pathname || u}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BrandProfileCard({ profile }: { profile: BrandProfile }) {
  const bb = profile.brandBasics;
  const logo = profile.logoSystem;
  const colors = profile.colorSystem;
  const voice = profile.voiceAndTone;
  const content = profile.contentStructure;
  const assets = profile.assets;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Header: name, tagline, industry, logo */}
        <div className="flex flex-wrap items-start gap-4 border-b border-slate-200 pb-4">
          {(profile.logoUrl || logo?.primaryLogo) && (
            <img
              src={profile.logoUrl || logo?.primaryLogo || ""}
              alt={`${profile.businessName} logo`}
              className="h-14 w-auto object-contain"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {profile.businessName}
            </h2>
            {(profile.tagline || bb?.tagline) && (
              <p className="mt-1 text-slate-600">
                {profile.tagline || bb?.tagline}
              </p>
            )}
            {profile.industry && (
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-sm text-slate-600">
                {profile.industry}
              </span>
            )}
          </div>
        </div>

        {/* Legacy + Brand basics */}
        <Section title="Brand basics">
          <div className="space-y-2 text-sm text-slate-700">
            {(bb?.shortDescription || profile.valueProposition) && (
              <p>{bb?.shortDescription || profile.valueProposition}</p>
            )}
            {(profile.missionStatement || bb?.mission) && (
              <p><strong>Mission:</strong> {profile.missionStatement || bb?.mission}</p>
            )}
            {bb?.positioningStatement && (
              <p><strong>Positioning:</strong> {bb.positioningStatement}</p>
            )}
            {(bb?.productNames?.length ?? 0) > 0 && (
              <p><strong>Products:</strong> {bb!.productNames!.join(", ")}</p>
            )}
            {(bb?.keyDifferentiators?.length ?? 0) > 0 && (
              <ul className="list-disc list-inside">{bb!.keyDifferentiators!.map((d) => <li key={d}>{d}</li>)}</ul>
            )}
            {(bb?.industriesServed?.length ?? 0) > 0 && (
              <p><strong>Industries:</strong> {bb!.industriesServed!.join(", ")}</p>
            )}
            {(bb?.useCases?.length ?? 0) > 0 && (
              <p><strong>Use cases:</strong> {bb!.useCases!.join(", ")}</p>
            )}
            {(bb?.competitiveReferences?.length ?? 0) > 0 && (
              <p><strong>Competitive refs:</strong> {bb!.competitiveReferences!.join(", ")}</p>
            )}
            {(profile.targetAudience || bb?.targetAudienceCues) && (
              <p><strong>Audience:</strong> {profile.targetAudience || bb?.targetAudienceCues}</p>
            )}
            {profile.services.length > 0 && (
              <div>
                <strong>Services:</strong>
                <ul className="flex flex-wrap gap-2 mt-1">
                  {profile.services.map((s) => (
                    <li key={s} className="rounded-md bg-slate-50 px-2 py-0.5 text-slate-700">{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.uniqueSellingPoints.length > 0 && (
              <ul className="list-disc list-inside">{profile.uniqueSellingPoints.map((u) => <li key={u}>{u}</li>)}</ul>
            )}
          </div>
        </Section>

        {/* Logo system */}
        {logo && (logo.primaryLogo || logo.favicons?.length || logo.appIcons?.length) ? (
          <Section title="Logo system">
            <div className="flex flex-wrap gap-4">
              {logo.primaryLogo && (
                <div>
                  <span className="text-xs text-slate-500 block">Primary</span>
                  <img src={logo.primaryLogo} alt="Primary logo" className="h-10 mt-1 object-contain" />
                </div>
              )}
              {logo.secondaryLogo && (
                <div>
                  <span className="text-xs text-slate-500 block">Secondary</span>
                  <img src={logo.secondaryLogo} alt="Secondary" className="h-10 mt-1 object-contain" />
                </div>
              )}
              {logo.favicons?.length ? (
                <div>
                  <span className="text-xs text-slate-500 block">Favicons</span>
                  <div className="flex gap-1 mt-1">
                    {logo.favicons.slice(0, 5).map((f) => (
                      <img key={f.url} src={f.url} alt="" className="h-6 w-6 object-contain" title={f.sizes} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {/* Color system */}
        {(colors || profile.brandColors?.length) ? (
          <Section title="Color system">
            <div className="flex flex-wrap gap-2 items-center">
              {(colors?.primary?.length ? colors.primary : profile.brandColors ?? []).map((c) => (
                <span
                  key={c}
                  className="h-8 w-8 rounded-full border border-slate-200 shadow-inner"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {colors?.secondary?.map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: c }} title={c} />
              ))}
              {colors?.accent?.map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: c }} title={c} />
              ))}
              <span className="text-xs text-slate-500 ml-1">Primary, secondary, accent</span>
            </div>
            {colors && Object.keys(colors.status).some((k) => (colors.status as Record<string, string[]>)[k]?.length) ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {(["success", "warning", "error", "info"] as const).map((k) =>
                  (colors.status[k]?.length ?? 0) > 0 ? (
                    <span key={k} className="text-xs text-slate-500">
                      {k}: {(colors.status[k] as string[]).map((v) => (
                        <span key={v} className="inline-block w-4 h-4 rounded border border-slate-200 ml-0.5 align-middle" style={{ backgroundColor: v }} title={v} />
                      ))}
                    </span>
                  ) : null
                )}
              </div>
            ) : null}
          </Section>
        ) : null}

        {/* Voice & tone */}
        {(voice || profile.toneOfVoice) && (
          <Section title="Voice & tone">
            <div className="flex flex-wrap gap-2 text-sm">
              {profile.toneOfVoice && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{profile.toneOfVoice}</span>
              )}
              {voice?.headlineStructure && (
                <span className="text-slate-600">Headlines: {voice.headlineStructure}</span>
              )}
              {voice?.ctaVerbs?.length ? (
                <span className="text-slate-600">CTAs: {voice.ctaVerbs.join(", ")}</span>
              ) : null}
              {voice?.buttonLabelStyle && (
                <span className="text-slate-600">Button style: {voice.buttonLabelStyle}</span>
              )}
            </div>
          </Section>
        )}

        {/* Content structure */}
        {content && (
          <Section title="Content structure">
            <div className="text-sm text-slate-700 space-y-1">
              {content.heroFormula?.headline && <p><strong>Hero headline:</strong> {content.heroFormula.headline}</p>}
              {content.heroFormula?.subhead && <p><strong>Hero subhead:</strong> {content.heroFormula.subhead}</p>}
              {content.heroFormula?.ctas?.length ? <p><strong>Hero CTAs:</strong> {content.heroFormula.ctas.join(", ")}</p> : null}
              {content.pricingTierWording?.length ? <p><strong>Pricing tiers:</strong> {content.pricingTierWording.join(", ")}</p> : null}
              {content.trustElements?.length ? <p><strong>Trust:</strong> {content.trustElements.join(", ")}</p> : null}
            </div>
          </Section>
        )}

        {/* Assets: show actual visuals (colors, gradients, images) */}
        {assets && (Object.keys(assets.cssVariables || {}).length || assets.mediaKitUrls?.length || assets.allImages?.length || assets.ogImages?.length || assets.svgLogos?.length) ? (
          <Section title="Assets & tokens">
            <AssetsVisual assets={assets} />
          </Section>
        ) : null}

        {/* Social */}
        {profile.socialLinks.length > 0 && (
          <Section title="Social">
            <div className="flex flex-wrap gap-2">
              {profile.socialLinks.map(({ platform, url }) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  title={platform}
                >
                  <span className="text-xs font-medium">{SOCIAL_ICONS[platform] ?? platform[0]}</span>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </article>
  );
}
