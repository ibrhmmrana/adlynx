import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/brand/scrapeBrand";
import { extractBrandProfile } from "@/lib/brand/extractBrandProfile";
import { buildExtendedSections } from "@/lib/brand/buildExtendedProfile";
import {
  analyzeBrandWithAI,
  aiFieldsToBrandBasics,
  aiFieldsToVoiceAndTone,
  aiFieldsToContentStructure,
} from "@/lib/brand/aiBrandAnalysis";
import type { BrandProfile } from "@/lib/brand/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : null;
    if (!url) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    const aggregated = await crawlWebsite(url);
    const partial = extractBrandProfile(aggregated);
    const extended = buildExtendedSections(aggregated);

    let aiFields;
    try {
      aiFields = await analyzeBrandWithAI(
        partial,
        aggregated.allMainText,
        aggregated.aboutPageText,
        aggregated.servicesPageText,
        aggregated.pricingPageText
      );
    } catch (e) {
      aiFields = {
        industry: partial.industry ?? null,
        missionStatement: null,
        valueProposition: null,
        toneOfVoice: null,
        targetAudience: null,
        uniqueSellingPoints: partial.services ?? [],
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
    }

    const brandProfile: BrandProfile = {
      businessName: partial.businessName ?? aggregated.domain.split(".")[0],
      tagline: partial.tagline ?? null,
      industry: aiFields.industry ?? partial.industry ?? null,
      websiteUrl: aggregated.url,
      domain: aggregated.domain,
      missionStatement: aiFields.missionStatement ?? null,
      valueProposition: aiFields.valueProposition ?? null,
      toneOfVoice: aiFields.toneOfVoice ?? null,
      logoUrl: partial.logoUrl ?? null,
      heroImageUrl: partial.heroImageUrl ?? null,
      brandColors: partial.brandColors ?? [],
      ogImage: partial.ogImage ?? null,
      socialLinks: partial.socialLinks ?? [],
      services: partial.services ?? [],
      targetAudience: aiFields.targetAudience ?? null,
      uniqueSellingPoints: aiFields.uniqueSellingPoints ?? [],
      aboutText: partial.aboutText ?? null,
      homepageText: partial.homepageText ?? null,
      brandBasics: aiFieldsToBrandBasics(partial, aiFields),
      logoSystem: extended.logoSystem,
      colorSystem: extended.colorSystem,
      voiceAndTone: aiFieldsToVoiceAndTone(aiFields),
      contentStructure: aiFieldsToContentStructure(aiFields),
      assets: extended.assets,
    };

    return NextResponse.json({
      success: true,
      brandProfile,
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || /timeout/i.test(err.message));
    if (isTimeout) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Website took too long to load. Try again or use a different URL.",
          code: "TIMEOUT",
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to scan website. The site may be blocking automated access or is unavailable.",
      },
      { status: 500 }
    );
  }
}
