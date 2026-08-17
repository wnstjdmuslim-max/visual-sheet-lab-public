import { describe, expect, it } from "vitest";
import { benchmarkFilterOptions, filterBenchmarkEntries } from "../shared/sheetRules";

type Entry = { analysis: { mood: string; bias: string } };

const entries: Entry[] = [
  { analysis: { mood: "Nocturnal / introspective", bias: "Blue / cyan bias" } },
  { analysis: { mood: "Nocturnal / introspective", bias: "Balanced chroma" } },
  { analysis: { mood: "Warm / intimate", bias: "Amber / red bias" } },
];

describe("film benchmark filters", () => {
  it("derives sorted unique MOOD and COLOR BIAS options", () => {
    expect(benchmarkFilterOptions(entries)).toEqual({
      moods: ["Nocturnal / introspective", "Warm / intimate"],
      biases: ["Amber / red bias", "Balanced chroma", "Blue / cyan bias"],
    });
  });

  it("supports independent, combined, reset, and empty-state filtering", () => {
    expect(filterBenchmarkEntries(entries, "Nocturnal / introspective", "ALL COLOR BIAS")).toHaveLength(2);
    expect(filterBenchmarkEntries(entries, "ALL MOODS", "Amber / red bias")).toHaveLength(1);
    expect(filterBenchmarkEntries(entries, "Nocturnal / introspective", "Balanced chroma")).toHaveLength(1);
    expect(filterBenchmarkEntries(entries, "ALL MOODS", "ALL COLOR BIAS")).toHaveLength(3);
    expect(filterBenchmarkEntries(entries, "Warm / intimate", "Blue / cyan bias")).toHaveLength(0);
  });
});
