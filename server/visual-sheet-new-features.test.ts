import { describe, expect, it } from "vitest";
import { comparePaletteDistance, makeBoardFilename, triggerCharacterPdfPrint } from "../shared/sheetRules";

describe("new visual sheet features", () => {
  it("scores identical palettes higher than distant palettes", () => {
    const same = comparePaletteDistance(["#111111", "#EEEEEE"], ["#111111", "#EEEEEE"]);
    const distant = comparePaletteDistance(["#111111", "#EEEEEE"], ["#FFFFFF", "#000000"]);
    expect(same.score).toBe(100);
    expect(distant.score).toBeLessThan(same.score);
  });

  it("keeps export filenames safe", () => {
    expect(makeBoardFilename("Character / Rain Test")).toBe("Character-Rain-Test.png");
  });

  it("opens a printable PDF workflow", () => {
    const popup = { document: { write: () => undefined, close: () => undefined } };
    const opened = triggerCharacterPdfPrint("Character Sheet", "FULL PROMPT", { open: () => popup } as any);
    expect(opened).toBe(true);
  });
});
