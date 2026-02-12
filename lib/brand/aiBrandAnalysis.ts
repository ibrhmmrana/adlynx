import OpenAI from "openai";
import type { BrandProfile, BrandBasics, VoiceAndTone, ContentStructure } from "./types";

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;
  return new OpenAI({ apiKey: key });
}

export interface AIBrandFields {
  industry: string | null;
  missionStatement: string | null;
  valueProposition: string | null;
  toneOfVoice: string | null;
  targetAudience: string | null;
  uniqueSellingPoints: string[];
  productNames: string[];
  shortDescription: string | null;
  positioningStatement: string | null;
  keyDifferentiators: string[];
  targetAudienceCues: string | null;
  industriesServed: string[];
  useCases: string[];
  competitiveReferences: string[];
  vocabularyConventions: string[];
  ctaVerbs: string[];
  buttonLabelStyle: string | null;
  errorMessageStyle: string | null;
  headlineStructure: string | null;
  heroHeadline: string | null;
  heroSubhead: string | null;
  heroCtas: string[];
  featureNamingConventions: string[];
  pricingTierWording: string[];
  trustElements: string[];
  legalLanguagePatterns: string[];
}

const DEFAULT_AI_FIELDS: AIBrandFields = {
  industry: null,
  missionStatement: null,
  valueProposition: null,
  toneOfVoice: null,
  targetAudience: null,
  uniqueSellingPoints: [],
  productNames: [],
  shortDescription: null,
  positioningStatement: null,
  keyDifferentiators: [],
  targetAudienceCues: null,
  industriesServed: [],
  useCases: [],
  competitiveReferences: [],
  vocabularyConventions: [],
  ctaVerbs: [],
  buttonLabelStyle: null,
  errorMessageStyle: null,
  headlineStructure: null,
  heroHeadline: null,
  heroSubhead: null,
  heroCtas: [],
  featureNamingConventions: [],
  pricingTierWording: [],
  trustElements: [],
  legalLanguagePatterns: [],
};

export async function analyzeBrandWithAI(
  partial: Partial<BrandProfile>,
  allMainText: string,
  aboutPageText: string | null,
  servicesPageText: string | null,
  pricingPageText?: string | null
): Promise<AIBrandFields> {
  const prompt = `You are a brand analyst. Given the following website content, extract the brand profile and messaging structure.

Business name: ${partial.businessName ?? "Unknown"}

Homepage text (first 3500 chars):
${allMainText.substring(0, 3500)}

About page text:
${aboutPageText?.substring(0, 2000) ?? "Not available"}

Services page text:
${servicesPageText?.substring(0, 1500) ?? "Not available"}

Pricing page text (if any):
${pricingPageText?.substring(0, 1500) ?? "Not available"}

Respond in JSON only. No markdown, no code block. Use null for missing values and empty arrays where nothing applies. Use this exact structure:

{
  "industry": "industry or category or null",
  "missionStatement": "mission/purpose 1-2 sentences or null",
  "valueProposition": "main selling point one sentence or null",
  "toneOfVoice": "one of: professional, casual, luxury, playful, authoritative, friendly, technical",
  "targetAudience": "who their customers are, one sentence or null",
  "uniqueSellingPoints": ["usp1", "usp2"],
  "productNames": ["product or service names mentioned"],
  "shortDescription": "one-line description or null",
  "positioningStatement": "how they position vs competitors or null",
  "keyDifferentiators": ["differentiator 1", "differentiator 2"],
  "targetAudienceCues": "demographics or psychographics cues or null",
  "industriesServed": ["industry 1", "industry 2"],
  "useCases": ["use case 1", "use case 2"],
  "competitiveReferences": ["any competitor or comparison mentioned"],
  "vocabularyConventions": ["recurring phrases or terms"],
  "ctaVerbs": ["Get Started", "Learn More", "Book Now", "etc"],
  "buttonLabelStyle": "e.g. sentence case vs Title Case, or null",
  "errorMessageStyle": "friendly vs strict or null",
  "headlineStructure": "sentence case vs title case, pattern or null",
  "heroHeadline": "typical hero headline pattern or null",
  "heroSubhead": "typical hero subhead pattern or null",
  "heroCtas": ["primary CTA", "secondary CTA"],
  "featureNamingConventions": ["how they name features or products"],
  "pricingTierWording": ["how they name tiers e.g. Starter, Pro"],
  "trustElements": ["testimonials", "logos", "security badges", "guarantees"],
  "legalLanguagePatterns": ["compliance or legal phrasing patterns"]
}`;

  const openai = getOpenAI();
  if (!openai) return { ...DEFAULT_AI_FIELDS };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ...DEFAULT_AI_FIELDS };

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      industry: (parsed.industry as string) ?? null,
      missionStatement: (parsed.missionStatement as string) ?? null,
      valueProposition: (parsed.valueProposition as string) ?? null,
      toneOfVoice: (parsed.toneOfVoice as string) ?? null,
      targetAudience: (parsed.targetAudience as string) ?? null,
      uniqueSellingPoints: Array.isArray(parsed.uniqueSellingPoints) ? (parsed.uniqueSellingPoints as string[]) : [],
      productNames: Array.isArray(parsed.productNames) ? (parsed.productNames as string[]) : [],
      shortDescription: (parsed.shortDescription as string) ?? null,
      positioningStatement: (parsed.positioningStatement as string) ?? null,
      keyDifferentiators: Array.isArray(parsed.keyDifferentiators) ? (parsed.keyDifferentiators as string[]) : [],
      targetAudienceCues: (parsed.targetAudienceCues as string) ?? null,
      industriesServed: Array.isArray(parsed.industriesServed) ? (parsed.industriesServed as string[]) : [],
      useCases: Array.isArray(parsed.useCases) ? (parsed.useCases as string[]) : [],
      competitiveReferences: Array.isArray(parsed.competitiveReferences) ? (parsed.competitiveReferences as string[]) : [],
      vocabularyConventions: Array.isArray(parsed.vocabularyConventions) ? (parsed.vocabularyConventions as string[]) : [],
      ctaVerbs: Array.isArray(parsed.ctaVerbs) ? (parsed.ctaVerbs as string[]) : [],
      buttonLabelStyle: (parsed.buttonLabelStyle as string) ?? null,
      errorMessageStyle: (parsed.errorMessageStyle as string) ?? null,
      headlineStructure: (parsed.headlineStructure as string) ?? null,
      heroHeadline: (parsed.heroHeadline as string) ?? null,
      heroSubhead: (parsed.heroSubhead as string) ?? null,
      heroCtas: Array.isArray(parsed.heroCtas) ? (parsed.heroCtas as string[]) : [],
      featureNamingConventions: Array.isArray(parsed.featureNamingConventions) ? (parsed.featureNamingConventions as string[]) : [],
      pricingTierWording: Array.isArray(parsed.pricingTierWording) ? (parsed.pricingTierWording as string[]) : [],
      trustElements: Array.isArray(parsed.trustElements) ? (parsed.trustElements as string[]) : [],
      legalLanguagePatterns: Array.isArray(parsed.legalLanguagePatterns) ? (parsed.legalLanguagePatterns as string[]) : [],
    };
  } catch {
    return { ...DEFAULT_AI_FIELDS };
  }
}

export function aiFieldsToBrandBasics(partial: Partial<BrandProfile>, ai: AIBrandFields): BrandBasics {
  return {
    brandName: partial.businessName ?? null,
    productNames: ai.productNames ?? [],
    tagline: partial.tagline ?? null,
    shortDescription: ai.shortDescription ?? null,
    mission: ai.missionStatement ?? null,
    positioningStatement: ai.positioningStatement ?? null,
    keyDifferentiators: ai.keyDifferentiators ?? [],
    targetAudienceCues: ai.targetAudienceCues ?? null,
    industriesServed: ai.industriesServed ?? [],
    useCases: ai.useCases ?? [],
    competitiveReferences: ai.competitiveReferences ?? [],
  };
}

export function aiFieldsToVoiceAndTone(ai: AIBrandFields): VoiceAndTone {
  return {
    tone: ai.toneOfVoice ?? null,
    vocabularyConventions: ai.vocabularyConventions ?? [],
    ctaVerbs: ai.ctaVerbs ?? [],
    buttonLabelStyle: ai.buttonLabelStyle ?? null,
    errorMessageStyle: ai.errorMessageStyle ?? null,
    headlineStructure: ai.headlineStructure ?? null,
  };
}

export function aiFieldsToContentStructure(ai: AIBrandFields): ContentStructure {
  return {
    heroFormula: {
      headline: ai.heroHeadline ?? null,
      subhead: ai.heroSubhead ?? null,
      ctas: ai.heroCtas ?? [],
    },
    featureNamingConventions: ai.featureNamingConventions ?? [],
    pricingTierWording: ai.pricingTierWording ?? [],
    trustElements: ai.trustElements ?? [],
    legalLanguagePatterns: ai.legalLanguagePatterns ?? [],
  };
}
