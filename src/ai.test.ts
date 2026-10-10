import assert from "node:assert/strict";
import { test } from "node:test";
import { createBuildPlan, fallbackBuildPlan } from "./ai.js";
import { SAMPLE_BUILD_PLAN } from "./schema.js";

test("local planning needs no Ollama request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Fetch must not be called when Ollama is disabled.");
  };
  try {
    assert.deepEqual(await createBuildPlan("fast industrial", false), fallbackBuildPlan("fast industrial"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ollama is called with non-streaming schema-constrained JSON and its plan is validated", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody: { stream?: boolean; format?: unknown } = {};
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as typeof requestBody;
    return new Response(JSON.stringify({ response: JSON.stringify(SAMPLE_BUILD_PLAN) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    assert.deepEqual(await createBuildPlan("dark industrial wave", true), SAMPLE_BUILD_PLAN);
    assert.equal(requestUrl, "http://localhost:11434/api/generate");
    assert.equal(requestBody.stream, false);
    assert.ok(requestBody.format);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("offline Ollama falls back to a deterministic local plan", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  globalThis.fetch = async () => {
    throw new Error("connection refused");
  };
  console.warn = () => {};
  try {
    assert.deepEqual(await createBuildPlan("neon wave", true), fallbackBuildPlan("neon wave"));
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
