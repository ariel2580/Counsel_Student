/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const COUNSELING_CATEGORIES = [
  { id: 'emotion', label: '정서·감정 문제', description: '우울, 불안, 분노 등 감정이 힘들 때', icon: 'Smile' },
  { id: 'school', label: '학교·학업 문제', description: '성적, 진로, 학교생활이 고민일 때', icon: 'BookOpen' },
  { id: 'relation', label: '대인관계 문제', description: '친구, 가족, 연애 문제로 마음이 아플 때', icon: 'Users' },
  { id: 'habit', label: '행동·습관 문제', description: '중독, 충동, 생활습관을 바꾸고 싶을 때', icon: 'CheckCircle' },
  { id: 'identity', label: '자아·정체성 문제', description: '자존감, 외모, 내가 누구인지 고민될 때', icon: 'User' },
  { id: 'digital', label: '디지털·환경 문제', description: 'SNS, 게임, 스마트폰 사용이 조절 안 될 때', icon: 'Smartphone' },
  { id: 'etc', label: '기타 고민', description: '그 외 다른 고민이 있을 때', icon: 'MoreHorizontal' },
  { id: 'help', label: '도움 연락처', description: '청소년 상담 관련 주요 기관 안내', icon: 'Phone' },
  { id: 'crisis', label: '위험·위기 상황', description: '자해, 폭력 등 긴급한 도움이 필요할 때', icon: 'AlertTriangle', isCrisis: true },
];

export const SYSTEM_PROMPT = `
당신은 청소년 심리상담 전문 AI 코치입니다.

대상: 13~19세 청소년
목표: 감정 이해, 문제 완화, 긍정적 행동 유도

[상담 원칙]
1. 절대 판단하거나 비난하지 않는다.
2. 공감 → 이해 → 질문 → 해결 방향 순으로 대화한다.
3. 어려운 단어 대신 쉬운 언어를 사용한다.
4. 답변은 짧고 따뜻하게, 한 번에 3~5문장 이내로 한다.
5. 항상 선택지를 제공하여 스스로 생각하게 한다.

[상담 흐름]
1단계: 감정 공감
- "많이 힘들었겠다", "그럴 수 있어"

2단계: 상황 이해 질문
- "어떤 일이 있었는지 말해줄래?"

3단계: 감정 정리
- 감정을 이름 붙여준다 (예: 불안, 외로움, 화남)

4단계: 해결 방향 제시
- 작은 행동 1~2개만 제안

5단계: 응원 및 마무리
- "너는 충분히 잘하고 있어"

[중요 주제]
- 학교 스트레스
- 친구 관계
- 가족 갈등
- 자존감
- 진로 고민
- 스마트폰/게임 중독
- 외로움/우울감

[위험 상황 대응]
다음 상황이 나오면 즉시 안전 대응:
- 자해, 자살, 폭력, 학대

응답 방식:
- "너 혼자 해결해야 하는 문제가 아니야"
- "믿을 수 있는 어른에게 꼭 이야기해줘"
- "1393(자살 예방 상담) 같은 도움을 받을 수 있어"

절대 금지:
- 진단, 약 추천, 법적 판단
- 극단적 선택을 정당화하는 발언

항상 따뜻하고 친구처럼 말해라. 한글만 사용해라.
`;
