import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createBuildPlan } from "./ai.js";
import { generateLevelObjects } from "./generator/gameplay.js";
import { writeSpwn } from "./generator/spwnWriter.js";
import { SAMPLE_BUILD_PLAN, type BuildPlan } from "./schema.js";
import { validateBuildPlan } from "./validator.js";

interface Options {
  prompt?: string;
  planPath?: string;
  output: string;
  ollama: boolean;
  model?: string;
}

async function main(args: string[]): Promise<void> {
  const options = parseArgs(args);
  let plan: BuildPlan;
  if (options.planPath) {
    const raw = await readFile(resolve(options.planPath), "utf8");
    plan = validateBuildPlan(parseJson(raw, options.planPath));
  } else if (options.prompt || options.ollama) {
    plan = validateBuildPlan(await createBuildPlan(options.prompt, options.ollama, options.model));
  } else {
    plan = validateBuildPlan(SAMPLE_BUILD_PLAN);
  }

  const objects = generateLevelObjects(plan);
  const output = resolve(options.output);
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(resolve(output, "build-plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8"),
    writeFile(resolve(output, "generated.spwn"), writeSpwn(plan, objects), "utf8"),
  ]);
  console.log(`Wrote ${objects.length} objects to ${output}`);
}

function parseArgs(args: string[]): Options {
  const options: Options = { output: "output", ollama: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--prompt" && value) {
      options.prompt = value;
      index += 1;
    } else if (argument === "--plan" && value) {
      options.planPath = value;
      index += 1;
    } else if (argument === "--output" && value) {
      options.output = value;
      index += 1;
    } else if (argument === "--ollama") {
      options.ollama = true;
    } else if (argument === "--model" && value) {
      options.model = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }
  if (options.planPath && (options.prompt || options.ollama)) {
    throw new Error("Use --plan separately from --prompt/--ollama.");
  }
  return options;
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Could not parse BuildPlan JSON from ${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function printHelp(): void {
  console.log([
    "gd-level-builder",
    "",
    '  npm run generate -- --prompt "dark industrial wave section"',
    "  npm run generate -- --plan build-plan.json",
    '  npm run generate -- --prompt "neon wave" --ollama [--model llama3.1]',
    "",
    "Options: --prompt <text>, --plan <path>, --ollama, --model <name>, --output <directory>, --help",
  ].join("\n"));
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`gd-level-builder: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
