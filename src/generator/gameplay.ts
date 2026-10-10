import type { BuildPlan } from "../schema.js";

export const MAX_OBJECT_COUNT = 5000;
const BEAT_WIDTH = 30;

export interface LevelObject {
  kind: "block" | "spike" | "orb";
  objectId: number;
  x: number;
  y: number;
  groupId: number;
  duration: number;
}

export function generateLevelObjects(plan: BuildPlan): LevelObject[] {
  const estimatedCount = plan.sections.reduce((total, section) => total + estimateSectionObjectCount(section), 0);
  if (estimatedCount > MAX_OBJECT_COUNT) {
    throw new Error(`Build plan generates at least ${estimatedCount} objects; maximum is ${MAX_OBJECT_COUNT}.`);
  }

  const objects: LevelObject[] = [];
  const beatDuration = 60 / plan.bpm;

  for (const section of plan.sections) {
    const sectionEnd = section.startBeat + section.durationBeats;
    if (section.type === "cube") {
      for (let offset = 0; offset < section.durationBeats; offset += 1) {
        const beat = section.startBeat + offset;
        const x = toX(beat);
        const y = section.lane * BEAT_WIDTH;
        objects.push({ kind: "block", objectId: 1, x, y, groupId: section.groupId, duration: beatDuration });
        if (offset + 1 < section.durationBeats) {
          objects.push({ kind: "spike", objectId: 8, x: x + BEAT_WIDTH, y, groupId: section.groupId, duration: beatDuration });
        }
        objects.push({
          kind: "orb",
          objectId: 36,
          x: x + BEAT_WIDTH / 2,
          y: y + BEAT_WIDTH + 15,
          groupId: section.groupId,
          duration: beatDuration,
        });
      }
    } else {
      const step = 1 / section.frequency;
      const steps = Math.ceil(section.durationBeats / step);
      for (let index = 0; index < steps; index += 1) {
        const beat = section.startBeat + index * step;
        const x = toX(beat);
        const y = Math.round(Math.sin(index * Math.PI / 2) * section.amplitude * BEAT_WIDTH);
        const duration = beatDuration * step;
        objects.push({ kind: "spike", objectId: 8, x, y, groupId: section.groupId, duration });
        objects.push({ kind: "orb", objectId: 36, x: x + BEAT_WIDTH / 2, y: y + BEAT_WIDTH, groupId: section.groupId, duration });
      }
    }

    const firstDecorationBeat = Math.ceil(section.startBeat / 4) * 4;
    const decorationCount = firstDecorationBeat < sectionEnd
      ? Math.ceil((sectionEnd - firstDecorationBeat) / 4)
      : 0;
    for (let index = 0; index < decorationCount; index += 1) {
      const beat = firstDecorationBeat + index * 4;
      objects.push({
        kind: "block",
        objectId: 1,
        x: toX(beat),
        y: 240,
        groupId: section.groupId,
        duration: beatDuration * 4,
      });
    }

  }

  return objects;
}

function estimateSectionObjectCount(section: BuildPlan["sections"][number]): number {
  const duration = section.durationBeats;
  const gameplayObjects = section.type === "cube"
    ? Math.ceil(duration) * 2 + Math.max(0, Math.ceil(duration - 1))
    : Math.ceil(duration * section.frequency) * 2;
  const firstDecorationBeat = Math.ceil(section.startBeat / 4) * 4;
  const sectionEnd = section.startBeat + duration;
  const decorationObjects = firstDecorationBeat < sectionEnd
    ? Math.ceil((sectionEnd - firstDecorationBeat) / 4)
    : 0;
  return gameplayObjects + decorationObjects;
}

function toX(beat: number): number {
  return Math.round(beat * BEAT_WIDTH);
}
