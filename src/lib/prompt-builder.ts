import type { DataBlock } from "@/types/problem";

export function buildPrompt(
  scenarioText: string,
  dataBlocks: DataBlock[],
  userNote: string,
): string {
  const dataSection = dataBlocks
    .map((b) => `### ${b.label}\n\`\`\`${b.language}\n${b.content}\n\`\`\``)
    .join("\n\n");

  return `당신은 시니어 DevOps 엔지니어입니다. 아래의 인프라 장애 시나리오에 대한 제 분석과 해결 방법을 검토해 주세요.

## 문제 상황
${scenarioText}

## 제공된 데이터
${dataSection}

## 나의 분석 및 해결 방법
${userNote || "(아직 작성하지 않았습니다)"}

---
위 내용을 검토하고 다음을 알려주세요:
1. 제 분석이 맞는지, 틀렸다면 어떤 부분이 잘못되었는지
2. 더 나은 해결 방법이 있다면 제안
3. 실무에서 이 상황을 예방하기 위한 팁`;
}
