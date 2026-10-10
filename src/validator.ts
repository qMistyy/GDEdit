import { BuildPlanSchema, type BuildPlan } from "./schema.js";
import { generateLevelObjects, MAX_OBJECT_COUNT } from "./generator/gameplay.js";

export const MIN_OBJECT_ID = 1;
export const MAX_OBJECT_ID = 9999;
export const MIN_GROUP_ID = 1;
export const MAX_GROUP_ID = 999;

export function validateBuildPlan(input: unknown): BuildPlan {
  const plan = BuildPlanSchema.parse(input);
  const groupIds = new Set<number>();
  for (const section of plan.sections) {
    if (groupIds.has(section.groupId)) {
      throw new Error(`Group ID ${section.groupId} is allocated to more than one section.`);
    }
    groupIds.add(section.groupId);
  }

  const objects = generateLevelObjects(plan);
  if (objects.length > MAX_OBJECT_COUNT) {
    throw new Error(`Build plan generates ${objects.length} objects; maximum is ${MAX_OBJECT_COUNT}.`);
  }
  for (const [index, object] of objects.entries()) {
    if (!Number.isInteger(object.objectId) || object.objectId < MIN_OBJECT_ID || object.objectId > MAX_OBJECT_ID) {
      throw new Error(`Generated object ${index + 1} has invalid object ID ${object.objectId}.`);
    }
    if (!Number.isInteger(object.groupId) || object.groupId < MIN_GROUP_ID || object.groupId > MAX_GROUP_ID) {
      throw new Error(`Generated object ${index + 1} has invalid group ID ${object.groupId}.`);
    }
    if (!Number.isFinite(object.duration) || object.duration <= 0) {
      throw new Error(`Generated object ${index + 1} has invalid duration ${object.duration}.`);
    }
  }
  return plan;
}
