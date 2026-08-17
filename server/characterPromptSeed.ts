import { buildCharacterPrompt, PromptFields, PromptLocks } from "../shared/sheetRules";

const baseFields: PromptFields = {
  description: "실제 참고 사진과 기존 캐릭터 시트의 얼굴 정체성을 정확히 유지한 60대 중후반 한국 남성. 약간 넓고 직사각형에 가까운 타원형 얼굴, 단단하지만 과도하게 각지지 않은 턱선, 자연스럽게 넓은 광대와 볼, 짧고 단정한 검은 머리와 약간의 회색 모발, 자연스러운 측면 가르마. 비교적 곧은 눈썹, 약간 가늘고 차분한 짙은 눈, 눈꺼풀의 자연스러운 노화, 넓고 둥근 코끝, 얇고 절제된 입술. 웃지 않을 때는 신중하고 책임감 있어 보이지만, 손자를 볼 때에는 눈가와 입가가 부드럽게 풀린다. 2~3세 손자를 자연스럽게 돌보는 할아버지이며, 신발을 신겨주거나 등에 업는 자연스러운 상호작용을 포함한다. 손과 팔이 아이의 몸을 뚫거나 겹치지 않아야 한다.",
  period: "2020년대 대한민국. 현대 한국의 가정과 가족 모임.",
  role: "가족 안에서 책임감 있는 형이자 2~3세 손자를 둔 할아버지. 실제 직업은 고정하지 않는다.",
  emotion: "책임감 있고 말수가 많지 않으며 가족을 행동으로 챙긴다. 손자에게는 익숙하고 다정하며, 손자를 바라볼 때만 자연스럽게 미소가 생긴다.",
  body: "보통 키의 단단한 중년 이후 남성 체형. 어깨가 반듯하고 중심이 안정적이며, 돌볼 때 무릎을 자연스럽게 굽힌다.",
  wardrobe: "짙은 네이비 투 버튼 정장, 흰색 드레스 셔츠, 채도가 낮은 중간 청색 넥타이, 흰색 포켓스퀘어, 검은색 가죽 정장 구두. 로고나 읽을 수 있는 문구는 없다.",
};

const locks: PromptLocks = { shoes: true, back: true, hands: true, lenses: true, mannequin: true, variation: true };

export const characterPromptSeed = [
  { caseName: "attached-universal-strong", platform: "Universal", strength: "Strong", fields: baseFields, locks, sourceLabel: "user attachment: Strong Filmic Continuity" },
  { caseName: "attached-universal-subtle", platform: "Universal", strength: "Subtle", fields: baseFields, locks, sourceLabel: "user attachment: Subtle Cinematic Realism" },
  { caseName: "attached-universal-heavy", platform: "Universal", strength: "Heavy", fields: baseFields, locks, sourceLabel: "user attachment: Heavy Muted Arthouse" },
].map(item => ({ ...item, outputs: buildCharacterPrompt(item.fields, item.platform, item.strength, item.locks) }));
