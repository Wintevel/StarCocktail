// 「향 반응 실험장」 공용 자료형. 모든 레인이 이 계약으로만 대화한다.
// 바꿀 때는 이 파일만 고치는 작은 PR을 따로 올리고, 다른 쪽 작업자가 확인한 뒤 머지한다.

/** three.js에 묶이지 않은 3차원 좌표(미터) */
export interface V3 {
  x: number;
  y: number;
  z: number;
}

// ── 도구·구름 ───────────────────────────────────────

/** 던질 수 있는 도구 */
export type ToolId = 'smoke' | 'orange' | 'mint' | 'lilac' | 'wood' | 'spark';
/** 향 캔(냄새가 있는 도구) */
export type ScentId = 'orange' | 'mint' | 'lilac' | 'wood';

export interface ToolDef {
  id: ToolId;
  /** 도구 막대 키(1~6) */
  key: number;
  name: string;
  /** 연기·색(#rrggbb). 불꽃은 불빛 색 */
  color: string;
  /** 냄새 낱말. 연막탄은 빈 배열 */
  words: string[];
  /** 스토리에서 처음부터 가지고 있는가(연막탄·불꽃) */
  starter: boolean;
  /** 손·투척체 모델 (src/exhibit/art) */
  model: 'scent-can' | 'smoke-grenade' | 'match';
}

/** 구름 종류: 도구가 남긴 구름이거나 반응이 남긴 구름 */
export type CloudKind = ToolId | ReactionId;

export interface CloudState {
  id: number;
  kind: CloudKind;
  pos: V3;
  /** 지금 반경(m) */
  radius: number;
  /** 생긴 시각(초, loop 시간) */
  born: number;
  /** 수명(초). Infinity면 걷히지 않음(모닥불 등) */
  life: number;
  color: string;
}

// ── 반응 ────────────────────────────────────────────

export type ReactionId =
  | 'dye' // 물들임: 연막탄 + 향
  | 'fizzBurst' // 청량 폭발: 귤 + 민트
  | 'petalWind' // 꽃바람: 라일락 + 민트
  | 'campfire' // 모닥불: 나무 + 불꽃
  | 'scentBlast' // 향 폭발: 향 + 불꽃(위 조합 제외)
  | 'winterStove' // 겨울 난로: 귤 + 나무
  | 'oldDrawer' // 오래된 서랍: 라일락 + 나무
  | 'springPicnic'; // 봄 소풍: 귤 + 라일락

export interface ReactionDef {
  id: ReactionId;
  name: string;
  /** 사람이 읽는 조합 설명(도감용), 예: '귤 + 민트' */
  recipe: string;
  /** 영구 색 반경(m). 물들임은 구름 반경을 따른다 */
  radius: number;
  /** 색이 영구인가(물들임만 false, 20초) */
  permanent: boolean;
  /** 반응 구름에 남는 냄새 낱말 */
  words: string[];
}

/** reactions.resolve()가 돌려주는 결과 */
export interface ReactionResult {
  id: ReactionId;
  /** 최종 반경(연막탄 깔개 ×1.5 반영) */
  radius: number;
  /** 색 구에 칠할 색들(섞여 보일 칸 색) */
  colors: string[];
  permanent: boolean;
  /** 연쇄로 터뜨릴 다른 구름 id(향 폭발) */
  chain: number[];
}

export interface ReactionEvent {
  result: ReactionResult;
  pos: V3;
  /** 반응에 쓰인 두 구름 */
  from: [CloudKind, CloudKind];
  /** 이번 판에서 처음 발견했는가 */
  firstTime: boolean;
}

// ── 색 칠하기 ───────────────────────────────────────

export interface PaintBlob {
  pos: V3;
  radius: number;
  colors: string[];
  /** 생긴 시각(초) */
  born: number;
  /** 수명(초). permanent면 Infinity */
  life: number;
}

// ── 맵·방·스토리 ────────────────────────────────────

/** 축 정렬 상자(충돌·방 범위) */
export interface Box3Like {
  min: V3;
  max: V3;
}

export type RoomId = 'field' | 'kitchen' | 'beach';

export interface RoomDef {
  id: RoomId;
  title: string;
  bounds: Box3Like;
  /** 이 방으로 들어가는 문(스토리에서 이전 방을 풀면 열림). 첫 방은 null */
  doorId: string | null;
  /** 기억 소품 위치(킁킁 맡으면 단서) */
  memoryProp: V3;
  /** 단서 낱말 3개 */
  clueWords: [string, string, string];
  /** 60초 뒤 직접 힌트 */
  hint: string;
  /** 이 중 하나가 방 안에서 일어나면 해결 */
  goals: ReactionId[];
  /** 숨긴 향 캔: 필요 2 + 미끼 1 */
  hiddenCans: { tool: ScentId; pos: V3 }[];
  /** 해결 시 한 줄 시 */
  poem: string;
}

// ── 냄새 맡기 ───────────────────────────────────────

/** 킁킁 모드에서 화면에 보일 냄새 한 줄기 */
export interface SniffCue {
  /** 원천 종류 */
  source: 'cloud' | 'can' | 'memory';
  words: string[];
  color: string;
  /** 카메라 기준 수평 각도(라디안, 0=정면, +오른쪽) */
  bearing: number;
  /** 0~1, 가까울수록 1 */
  strength: number;
}

export interface SniffView {
  active: boolean;
  /** 플레이어 머리가 들어 있는 구름 색들(가장자리 물들이기) */
  insideColors: string[];
  cues: SniffCue[];
}

// ── 모드 ────────────────────────────────────────────

export type Mode = 'title' | 'story' | 'free' | 'paused' | 'ending';

/** loop.ts에 등록되는 시스템 */
export interface System {
  update(dt: number, t: number): void;
  /** 자유 실험 R 키·새 판 시작 때 처음 상태로 */
  reset?(): void;
}
