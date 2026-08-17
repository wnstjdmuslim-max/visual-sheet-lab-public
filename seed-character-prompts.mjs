import { characterPromptSeed } from "./server/characterPromptSeed.ts";
import { upsertCharacterPromptBenchmark } from "./server/db.ts";

for (const item of characterPromptSeed) {
  await upsertCharacterPromptBenchmark({
    caseName: item.caseName,
    platform: item.platform,
    strength: item.strength,
    inputFields: JSON.stringify({ fields: item.fields, locks: item.locks }),
    outputPrompts: JSON.stringify(item.outputs),
    sourceLabel: item.sourceLabel,
  });
}
console.log(`seeded ${characterPromptSeed.length} character prompt benchmarks`);
