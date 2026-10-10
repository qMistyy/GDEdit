import { z } from "zod";

const SectionBase = z.object({
  startBeat: z.number().finite().min(0).max(1_000_000),
  durationBeats: z.number().finite().positive().max(5_000),
  groupId: z.number().int().min(1).max(999),
}).strict();

const CubeSectionSchema = SectionBase.extend({
  type: z.literal("cube"),
  lane: z.number().int().min(-3).max(3),
}).strict();

const WaveSectionSchema = SectionBase.extend({
  type: z.literal("wave"),
  amplitude: z.number().finite().min(1).max(12),
  frequency: z.number().finite().min(0.25).max(4),
}).strict();

export const BuildPlanSchema = z.object({
  version: z.literal(1),
  name: z.string().trim().min(1).max(80),
  theme: z.string().trim().min(1).max(80),
  bpm: z.number().finite().min(30).max(300),
  sections: z.array(z.discriminatedUnion("type", [CubeSectionSchema, WaveSectionSchema])).min(1).max(100),
}).strict();

export type BuildPlan = z.infer<typeof BuildPlanSchema>;
export type BuildSection = BuildPlan["sections"][number];

export const SAMPLE_BUILD_PLAN: BuildPlan = {
  version: 1,
  name: "Industrial Wave",
  theme: "dark industrial",
  bpm: 140,
  sections: [
    { type: "cube", startBeat: 0, durationBeats: 8, lane: 0, groupId: 1 },
    { type: "wave", startBeat: 8, durationBeats: 16, amplitude: 5, frequency: 1, groupId: 2 },
  ],
};

export const BUILD_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["version", "name", "theme", "bpm", "sections"],
  properties: {
    version: { type: "integer", const: 1 },
    name: { type: "string", minLength: 1, maxLength: 80 },
    theme: { type: "string", minLength: 1, maxLength: 80 },
    bpm: { type: "number", minimum: 30, maximum: 300 },
    sections: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "startBeat", "durationBeats", "groupId", "lane"],
            properties: {
              type: { type: "string", const: "cube" },
              startBeat: { type: "number", minimum: 0, maximum: 1_000_000 },
              durationBeats: { type: "number", exclusiveMinimum: 0, maximum: 5_000 },
              groupId: { type: "integer", minimum: 1, maximum: 999 },
              lane: { type: "integer", minimum: -3, maximum: 3 },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "startBeat", "durationBeats", "groupId", "amplitude", "frequency"],
            properties: {
              type: { type: "string", const: "wave" },
              startBeat: { type: "number", minimum: 0, maximum: 1_000_000 },
              durationBeats: { type: "number", exclusiveMinimum: 0, maximum: 5_000 },
              groupId: { type: "integer", minimum: 1, maximum: 999 },
              amplitude: { type: "number", minimum: 1, maximum: 12 },
              frequency: { type: "number", minimum: 0.25, maximum: 4 },
            },
          },
        ],
      },
    },
  },
} as const;
