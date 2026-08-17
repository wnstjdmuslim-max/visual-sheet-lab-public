import { describe, expect, it } from "vitest";
import { filmGrabSeed } from "./filmGrabSeed";

describe("filmGrabSeed", () => {
  it("contains 60 films with nine source frames and eight palette colors each", () => {
    expect(filmGrabSeed).toHaveLength(60);
    expect(new Set(filmGrabSeed.map(item => item.sourcePage)).size).toBe(60);
    for (const item of filmGrabSeed) {
      expect(item.imageUrls).toHaveLength(9);
      expect(item.palette).toHaveLength(8);
      expect(item.analysis.palette).toHaveLength(8);
      expect(item.sourcePage).toMatch(/^https:\/\/film-grab\.com\//);
    }
  });
});
