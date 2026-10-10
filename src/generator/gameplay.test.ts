import assert from "node:assert/strict";
import { test } from "node:test";
import { generateLevelObjects } from "./gameplay.js";
import { writeSpwn } from "./spwnWriter.js";
import { SAMPLE_BUILD_PLAN } from "../schema.js";
import { validateBuildPlan } from "../validator.js";

test("sample plan creates bounded objects with positive durations", () => {
  const plan = validateBuildPlan(SAMPLE_BUILD_PLAN);
  const objects = generateLevelObjects(plan);
  assert.ok(objects.length > 0);
  assert.ok(objects.length <= 5000);
  assert.ok(objects.every(({ duration, groupId }) => duration > 0 && groupId >= 1 && groupId <= 999));
});

test("writer emits section comments, helper and grouped objects", () => {
  const output = writeSpwn(SAMPLE_BUILD_PLAN, generateLevelObjects(SAMPLE_BUILD_PLAN));
  assert.match(output, /Generated gameplay and decoration/);
  assert.match(output, /let place = \(object_id: @number/);
  assert.match(output, /\$\.add\(obj \{/);
  assert.match(output, /GROUPS: group_id/);
  assert.match(output, /let section_1 = 1g/);
  assert.match(output, /place\(1, 0, 0, section_1\)/);
});

test("validator rejects extra properties and invalid ranges", () => {
  assert.throws(() => validateBuildPlan({ ...SAMPLE_BUILD_PLAN, extra: true }));
  assert.throws(() => validateBuildPlan({
    ...SAMPLE_BUILD_PLAN,
    sections: [{ type: "cube", startBeat: 0, durationBeats: 1, lane: 0, groupId: 1000 }],
  }));
});

test("generator rejects oversized plans before allocating their objects", () => {
  assert.throws(() => validateBuildPlan({
    ...SAMPLE_BUILD_PLAN,
    sections: [{ type: "wave", startBeat: 0, durationBeats: 5000, amplitude: 5, frequency: 4, groupId: 1 }],
  }), /maximum is 5000/);
});
