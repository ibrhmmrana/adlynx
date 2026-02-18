/**
 * Generate Facebook Ads Manager ad set strategy (targeting, budget, placements, etc.)
 * using OpenAI gpt-4o-mini. Input: brand + product context; output: structured JSON.
 */

export type AdsetStrategyInput = {
  brandName: string;
  tagline?: string | null;
  mission?: string | null;
  sellingType?: "products" | "saas" | "services" | null;
  websiteUrl?: string;
  domain?: string;
  productTitle?: string;
  productDescription?: string | null;
  productPrice?: string | null;
};

export type TargetAudience = {
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
};

export type AdsetStrategy = {
  campaignObjective: string;
  targetAudience: TargetAudience;
  locations: string[];
  placements: string[];
  dailyBudget: string;
  schedule: string;
  bidStrategy: string;
  optimizationGoal: string;
  icp: string;
  rationale: string;
};

const STRATEGY_JSON_SCHEMA = `
Return a single JSON object (no markdown, no code fence) with exactly these keys:
- campaignObjective: string (e.g. "Conversions", "Traffic", "Brand Awareness")
- targetAudience: object with ageMin (number), ageMax (number), genders (array of strings), interests (array of strings), behaviors (array of strings), customAudiences (array of strings, can be empty)
- locations: array of country/region names as strings
- placements: array of placement names (e.g. "Facebook Feed", "Instagram Feed", "Stories", "Reels")
- dailyBudget: string (e.g. "$15–$30/day" or "$20/day")
- schedule: string (e.g. "Run continuously" or "Weekdays 8am–10pm")
- bidStrategy: string (e.g. "Lowest cost" or "Cost cap")
- optimizationGoal: string (e.g. "Purchases", "Link clicks", "Landing page views")
- icp: string (1–2 sentences describing the ideal customer profile)
- rationale: string (brief explanation of why these settings were chosen)
`;

export async function generateAdsetStrategy(input: AdsetStrategyInput): Promise<AdsetStrategy> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set (required for ad set strategy)");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });

  const {
    brandName,
    tagline,
    mission,
    sellingType,
    websiteUrl,
    domain,
    productTitle,
    productDescription,
    productPrice,
  } = input;

  const productPart = [
    productTitle && `Product: ${productTitle}`,
    productDescription && productDescription.trim() && productDescription.trim().slice(0, 300),
    productPrice && `Price: ${productPrice}`,
  ]
    .filter(Boolean)
    .join(". ");

  const locationHint = domain
    ? `Domain "${domain}" may hint at primary market (e.g. .uk → United Kingdom). Infer country/region from that and the business type.`
    : "Infer likely countries of operation from the business type and niche.";

  const userContent = [
    `Brand: ${brandName}.`,
    tagline && `Tagline: "${tagline}".`,
    mission && `Mission: ${mission.slice(0, 200)}.`,
    sellingType && `Business type: ${sellingType}.`,
    (websiteUrl || domain) && `Website: ${websiteUrl || domain}.`,
    productPart && `\n${productPart}`,
    `\n${STRATEGY_JSON_SCHEMA}`,
    `\n${locationHint}`,
  ]
    .filter(Boolean)
    .join(" ");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a Facebook Ads strategist. Given a brand's niche, product, and business type, output recommended Ad Set settings as a single JSON object. Use realistic Facebook Ads Manager terminology. Infer target market and ICP from the context. Keep arrays concise (3–6 items where applicable).",
      },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 800,
    temperature: 0.5,
  });

  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI returned no ad set strategy");

  try {
    const parsed = JSON.parse(raw) as AdsetStrategy;
    if (!parsed.campaignObjective || !parsed.targetAudience || !Array.isArray(parsed.locations)) {
      throw new Error("Invalid strategy shape");
    }
    parsed.targetAudience = {
      ageMin: parsed.targetAudience?.ageMin ?? 18,
      ageMax: parsed.targetAudience?.ageMax ?? 65,
      genders: Array.isArray(parsed.targetAudience?.genders) ? parsed.targetAudience.genders : [],
      interests: Array.isArray(parsed.targetAudience?.interests) ? parsed.targetAudience.interests : [],
      behaviors: Array.isArray(parsed.targetAudience?.behaviors) ? parsed.targetAudience.behaviors : [],
      customAudiences: Array.isArray(parsed.targetAudience?.customAudiences) ? parsed.targetAudience.customAudiences : [],
    };
    parsed.locations = Array.isArray(parsed.locations) ? parsed.locations : [];
    parsed.placements = Array.isArray(parsed.placements) ? parsed.placements : ["Facebook Feed", "Instagram Feed"];
    parsed.dailyBudget = parsed.dailyBudget ?? "$20/day";
    parsed.schedule = parsed.schedule ?? "Run continuously";
    parsed.bidStrategy = parsed.bidStrategy ?? "Lowest cost";
    parsed.optimizationGoal = parsed.optimizationGoal ?? "Conversions";
    parsed.icp = parsed.icp ?? "Audience inferred from brand and product.";
    parsed.rationale = parsed.rationale ?? "";
    return parsed;
  } catch (e) {
    throw new Error("Failed to parse ad set strategy JSON");
  }
}
