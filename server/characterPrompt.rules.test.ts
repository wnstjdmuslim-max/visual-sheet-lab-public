import { describe, expect, it } from "vitest";
import { characterPromptSeed } from "./characterPromptSeed";
import { buildCharacterPrompt } from "../shared/sheetRules";
import { attachmentPromptReference } from "../shared/characterPromptAttachmentReference";
import { characterPromptSnapshots } from "../shared/characterPromptSnapshots";

describe("character prompt benchmark rules", () => {
  it("contains the three attachment-derived strength cases", () => {
    expect(characterPromptSeed.map(item => item.strength)).toEqual(["Strong", "Subtle", "Heavy"]);
    expect(characterPromptSeed.map(item => item.sourceLabel)).toEqual([
      "user attachment: Strong Filmic Continuity",
      "user attachment: Subtle Cinematic Realism",
      "user attachment: Heavy Muted Arthouse",
    ]);
  });

  it("keeps board zones, Korean translation instruction, locks, and negative protection", () => {
    const result = buildCharacterPrompt(characterPromptSeed[0].fields, "Universal", "Strong", characterPromptSeed[0].locks);
    expect(result.full).toContain("[FREE CHARACTER SHEET PROMPT — Universal]");
    expect(result.full).toContain("strong filmic continuity look");
    expect(result.full).toContain("IDENTITY ZONE");
    expect(result.full).toContain("CINEMATIC HUMAN ZONE");
    expect(result.full).toContain("PRODUCTION CONTINUITY ZONE");
    expect(result.full).toContain("translate the meaning internally into precise English visual-production language");
    expect(result.full).toContain("shoes clearly visible in full-body frames");
    expect(result.full).toContain("skin must look tactile and human");
    expect(result.negative).toContain("plastic skin");
  });

  it("emits platform-specific output rules", () => {
    const fields = { description: "a Korean actor" };
    const gpt = buildCharacterPrompt(fields, "GPT", "Strong", {});
    const midjourney = buildCharacterPrompt(fields, "Midjourney", "Strong", {});
    expect(gpt.full).toContain("structured GPT image-generation instruction");
    expect(midjourney.full).toContain("Midjourney-ready cinematic prompt");
    expect(midjourney.full).toContain("--ar 4:5 --stylize 100");
    expect(midjourney.negative).toContain("--no plastic skin");
  });

  it("matches the attachment-derived FULL PROMPT snapshots for all three strengths", () => {
    for (const item of characterPromptSeed) {
      const result = buildCharacterPrompt(item.fields, "Universal", item.strength, item.locks);
      const snapshot = characterPromptSnapshots[item.strength as keyof typeof characterPromptSnapshots];
      expect(result.full.startsWith(snapshot.header)).toBe(true);
      expect(result.full).toContain(snapshot.style);
      for (const section of snapshot.sections) expect(result.full).toContain(section);
    }
  });

  it("matches the attachment-derived FULL PROMPT structure for all three strengths", () => {
    for (const item of characterPromptSeed) {
      const result = buildCharacterPrompt(item.fields, item.platform, item.strength, item.locks);
      for (const section of attachmentPromptReference.requiredSections) expect(result.full).toContain(section);
      for (const phrase of attachmentPromptReference.requiredPhrases) expect(result.full).toContain(phrase);
      expect(result.full).toContain(attachmentPromptReference.strengthDirections[item.strength as keyof typeof attachmentPromptReference.strengthDirections]);
    }
  });

  it("emits distinct visual direction for each strength", () => {
    const fields = { description: "a Korean actor" };
    expect(buildCharacterPrompt(fields, "Universal", "Subtle", {}).full).toContain("subtle cinematic realism");
    expect(buildCharacterPrompt(fields, "Universal", "Strong", {}).full).toContain("strong filmic continuity look");
    expect(buildCharacterPrompt(fields, "Universal", "Heavy", {}).full).toContain("heavy muted arthouse film look");
  });
});
