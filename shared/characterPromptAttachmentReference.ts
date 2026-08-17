export const attachmentPromptReference = {
  requiredSections: ["IDENTITY ZONE", "CINEMATIC HUMAN ZONE", "PRODUCTION CONTINUITY ZONE", "Hidden Character Realism Protection", "Avoid:"],
  requiredPhrases: [
    "translate the meaning internally into precise English visual-production language",
    "front full-body view",
    "left profile",
    "right profile in a natural walking pose",
    "clear back full-body view",
    "shoes clearly visible in full-body frames",
    "back full-body view with neck posture and shoulder silhouette",
    "hand detail frame: veins, skin texture, natural tension",
    "lens variance: 28mm wide / 35mm observational / 50mm natural / 85mm close-up",
    "no mannequin posture — natural weight imbalance and imperfect stance",
    "continuity consistency not cloning — subtle natural variation allowed",
    "skin must look tactile and human, not polished or cosmetic",
  ],
  strengthDirections: {
    Strong: "strong filmic continuity look",
    Subtle: "subtle cinematic realism",
    Heavy: "heavy muted arthouse film look",
  },
} as const;
