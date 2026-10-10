import { BuildPlanSchema, BUILD_PLAN_JSON_SCHEMA, type BuildPlan } from "./schema.js";
import { validateBuildPlan } from "./validator.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "llama3.1";
const REQUEST_TIMEOUT_MS = 15_000;

export async function createBuildPlan(
  prompt: string | undefined,
  useOllama: boolean,
  model = DEFAULT_MODEL,
): Promise<BuildPlan> {
  const request = prompt?.trim() || "Create a short cube-to-wave level section.";
  if (!useOllama) return fallbackBuildPlan(request);

  let response: Response;
  try {
    response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        prompt: [
          "Create a Geometry Dash level BuildPlan matching the request.",
          "Output only a JSON object matching the given JSON schema. Do not output SPWN, executable code, or shell commands.",
          `User request: ${request}`,
        ].join("\n"),
        stream: false,
        format: BUILD_PLAN_JSON_SCHEMA,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Ollama unavailable (${reason}); using the deterministic local BuildPlan fallback.`);
    return fallbackBuildPlan(request);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Ollama returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`Invalid Ollama API response: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isOllamaResponse(payload) || typeof payload.response !== "string") {
    throw new Error("Ollama API response did not contain a text BuildPlan.");
  }

  let data: unknown;
  try {
    data = JSON.parse(payload.response);
  } catch (error) {
    throw new Error(`Ollama response was not BuildPlan JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return validateBuildPlan(BuildPlanSchema.parse(data));
}

export function fallbackBuildPlan(prompt: string): BuildPlan {
  const normalized = prompt.toLowerCase();
  return {
    version: 1,
    name: prompt.trim().replace(/\s+/g, " ").slice(0, 80) || "Generated Level",
    theme: normalized.includes("industrial") ? "dark industrial" : normalized.includes("neon") ? "neon" : "generated",
    bpm: normalized.includes("fast") ? 160 : 140,
    sections: [
      { type: "cube", startBeat: 0, durationBeats: 8, lane: 0, groupId: 1 },
      { type: "wave", startBeat: 8, durationBeats: 16, amplitude: 5, frequency: 1, groupId: 2 },
    ],
  };
}

function isOllamaResponse(value: unknown): value is { response?: unknown } {
  return typeof value === "object" && value !== null && "response" in value;
}
