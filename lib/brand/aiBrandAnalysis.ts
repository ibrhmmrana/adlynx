import OpenAI from "openai";

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;
  return new OpenAI({ apiKey: key });
}

/**
 * Generate a concise brand mission statement from scraped website content.
 * Intentionally narrow scope: only asks for a mission, keeping token usage low.
 */
export async function generateMission(
  businessName: string,
  tagline: string | null,
  homepageText: string,
  aboutPageText: string | null
): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const prompt = `You are a brand strategist. Based on the following website content, write a concise 1-2 sentence brand mission statement.

Business name: ${businessName}
${tagline ? `Tagline: ${tagline}` : ""}

Homepage text (first 2000 chars):
${homepageText.substring(0, 2000)}

${aboutPageText ? `About page text (first 1500 chars):\n${aboutPageText.substring(0, 1500)}` : ""}

Respond with ONLY the mission statement text, no quotes, no preamble. If you cannot determine a mission, respond with exactly: null`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw || raw.toLowerCase() === "null") return null;
    return raw;
  } catch {
    return null;
  }
}
