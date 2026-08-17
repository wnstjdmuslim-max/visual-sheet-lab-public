import { describe, expect, it } from "vitest";
import { filterBenchmarkEntries, filterFavoriteEntries, readLibrary, toggleFavoriteKey, writeLibrary } from "../shared/sheetRules";

type Entry = { item: { sourcePage: string }; analysis: { mood: string; bias: string } };

const entries: Entry[] = [
  { item: { sourcePage: "film-a" }, analysis: { mood: "Nocturnal", bias: "Blue" } },
  { item: { sourcePage: "film-b" }, analysis: { mood: "Warm", bias: "Amber" } },
];

describe("film benchmark favorites", () => {
  it("adds and removes a source page without duplicates", () => {
    expect(toggleFavoriteKey([], "film-a")).toEqual(["film-a"]);
    expect(toggleFavoriteKey(["film-a"], "film-a")).toEqual([]);
    expect(toggleFavoriteKey(["film-a", "film-b"], "film-c")).toEqual(["film-a", "film-b", "film-c"]);
  });

  it("filters the favorites view and supports an empty state", () => {
    expect(filterFavoriteEntries(entries, ["film-a"])).toHaveLength(1);
    expect(filterFavoriteEntries(entries, ["missing-film"])).toHaveLength(0);
  });

  it("combines favorites with MOOD and COLOR BIAS filters", () => {
    const moodAndBias = filterBenchmarkEntries(entries, "Nocturnal", "Blue");
    expect(filterFavoriteEntries(moodAndBias, ["film-a"])).toHaveLength(1);
    expect(filterFavoriteEntries(filterBenchmarkEntries(entries, "Warm", "Blue"), ["film-a"])).toHaveLength(0);
  });

  it("persists and restores favorites through the storage adapter", () => {
    let value: string | null = null;
    const storage = {
      getItem: () => value,
      setItem: (_key: string, next: string) => { value = next; },
    };
    writeLibrary(storage, "filmgrab-favorites", ["film-a"]);
    expect(readLibrary<string>(storage, "filmgrab-favorites")).toEqual(["film-a"]);
  });
});
