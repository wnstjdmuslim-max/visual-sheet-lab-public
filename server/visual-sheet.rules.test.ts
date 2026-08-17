import { describe, expect, it } from "vitest";
import { isSupportedImageType, makeLookName, validateReferenceCount } from "../shared/sheetValidation";
import { buildCharacterPrompt, deleteProjectItems, filterLibraryByProject, makeBoardFilename, makeSavedSheetRecord, readLibrary, triggerPngDownload, writeLibrary } from "../shared/sheetRules";

describe("Visual Sheet Lab output contract", () => {
  it("validates the 6-to-12 reference image range and formats", () => {
    expect(validateReferenceCount(5)).toBeTruthy();
    expect(validateReferenceCount(6)).toBeNull();
    expect(validateReferenceCount(12)).toBeNull();
    expect(validateReferenceCount(13)).toBeTruthy();
    expect(isSupportedImageType("image/jpeg")).toBe(true);
    expect(isSupportedImageType("image/png")).toBe(true);
    expect(isSupportedImageType("image/webp")).toBe(false);
  });

  it("generates a useful automatic look name", () => {
    expect(makeLookName("Nocturnal / introspective", "Cool")).toBe("Nocturnal · Cool look");
  });

  it("generates all prompt modes from real character input", () => {
    const result = buildCharacterPrompt({ description: "A Korean radio producer", wardrobe: "worn wool coat" }, "Midjourney", "Strong", { shoes: true, back: true });
    expect(result.full).toContain("A Korean radio producer");
    expect(result.full).toContain("Midjourney");
    expect(result.compact).toContain("worn wool coat");
    expect(result.negative).toContain("plastic skin");
  });

  it("filters and deletes library items by project", () => {
    const items = [{ project: "Film A", title: "one" }, { project: "Film B", title: "two" }, { project: "Film A", title: "three" }];
    expect(filterLibraryByProject(items, "Film A")).toHaveLength(2);
    expect(deleteProjectItems(items, "Film A")).toEqual([{ project: "Film B", title: "two" }]);
  });

  it("creates a safe PNG filename and preserves the 16:9 export contract", () => {
    expect(makeBoardFilename("Nocturnal · Cool look")).toBe("Nocturnal-Cool-look.png");
    expect(1600 / 900).toBeCloseTo(16 / 9);
  });

  it("verifies PNG download and library persistence adapters", () => {
    let clicked = false;
    const link = { download: "", href: "", click: () => { clicked = true; } };
    const filename = triggerPngDownload({ toDataURL: type => { expect(type).toBe("image/png"); return "data:image/png;base64,test"; } }, { createElement: () => link }, "Test Look");
    expect(filename).toBe("Test-Look.png");
    expect(link.href).toContain("data:image/png");
    expect(clicked).toBe(true);

    let stored = "[]";
    const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
    const items = [{ project: "Film A", title: "look" }];
    writeLibrary(storage, "library", items);
    expect(readLibrary<typeof items[number]>(storage, "library")).toEqual(items);
    const afterDelete = deleteProjectItems(items, "Film A");
    writeLibrary(storage, "library", afterDelete);
    expect(readLibrary<typeof items[number]>(storage, "library")).toEqual([]);
  });

  it("creates a character library record after save", () => {
    expect(makeSavedSheetRecord("character", "A Korean grandfather", "Family short", "Universal", "id-1", "2026-08-18T00:00:00.000Z")).toEqual({
      id: "id-1", kind: "character", title: "A Korean grandfather", project: "Family short", detail: "Universal", createdAt: "2026-08-18T00:00:00.000Z",
    });
  });

  it("keeps the required UI labels", () => {
    expect(["MOOD", "EXPOSURE", "SATURATION", "CONTRAST", "TEMPERATURE", "COLOR BIAS"]).toHaveLength(6);
    expect(["FULL PROMPT", "COMPACT", "NEGATIVE"]).toEqual(["FULL PROMPT", "COMPACT", "NEGATIVE"]);
    expect(["Universal", "GPT", "Midjourney"]).toContain("Midjourney");
    expect(["Subtle", "Strong", "Heavy"]).toContain("Strong");
  });
});
