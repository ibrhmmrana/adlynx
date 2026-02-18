import { z } from "zod";

const shotIdSchema = z.enum(["intro", "product_closeup", "interaction"]);
const aspectRatioSchema = z.literal("9:16");

export const cameraSchema = z.object({
  shot: z.string(),
  movement: z.string(),
  aspectRatio: aspectRatioSchema,
});

export const shotSchema = z.object({
  shotId: shotIdSchema,
  scene: z.string(),
  dialogue: z.array(z.string()),
  subtitle: z.string().optional(),
  camera: cameraSchema,
  lighting: z.string(),
  environment: z.string(),
  action: z.string(),
  transition: z.enum(["cut", "none"]).optional(),
});

export const audioSchema = z.object({
  voice: z.string(),
  soundtrack: z.string(),
});

export const productRefSchema = z.object({
  brand: z.string(),
  name: z.string(),
});

export const promptPayloadSchema = z.object({
  prompt: z.object({
    shots: z.array(shotSchema),
    durationSeconds: z.number().min(8).max(12),
    style: z.string(),
    audio: audioSchema,
    product: productRefSchema,
  }),
  config: z.object({
    model: z.string(),
    negativePrompt: z.string(),
    seed: z.number().optional(),
  }),
});

export type VeoPromptPayload = z.infer<typeof promptPayloadSchema>;
export type VeoShot = z.infer<typeof shotSchema>;
export type VeoShotId = z.infer<typeof shotIdSchema>;
