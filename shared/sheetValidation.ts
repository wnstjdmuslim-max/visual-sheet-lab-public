export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const BOARD_COUNTS = [6, 9, 12] as const;

export function validateReferenceCount(count: number) {
  if (count < 6) return "At least 6 reference images are required.";
  if (count > 12) return "A maximum of 12 reference images is supported.";
  return null;
}

export function isSupportedImageType(type: string) {
  return SUPPORTED_IMAGE_TYPES.includes(type as (typeof SUPPORTED_IMAGE_TYPES)[number]);
}

export function makeLookName(mood: string, temperature: string) {
  const moodWord = mood.split(" /")[0].trim() || "Cinematic";
  return `${moodWord} · ${temperature || "Neutral"} look`;
}
