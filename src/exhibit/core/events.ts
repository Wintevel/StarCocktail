// 타입 있는 작은 이벤트 버스. 모듈끼리는 서로 import하지 않고 여기로만 알린다.

import type { CloudState, Mode, ReactionEvent, RoomId, SniffView, ToolId, V3 } from './types';

export interface GameEvents {
  throw: { tool: ToolId; from: V3; dir: V3 };
  burst: { tool: ToolId; pos: V3 };
  cloudSpawned: CloudState;
  cloudGone: { id: number };
  reaction: ReactionEvent;
  pickup: { tool: ToolId };
  roomSolved: { room: RoomId };
  mode: { mode: Mode; prev: Mode };
  sniff: SniffView;
  reset: Record<string, never>;
}

type Handler<T> = (payload: T) => void;

class Bus {
  private map = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.map.get(type);
    if (!set) this.map.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]) {
    for (const fn of this.map.get(type) ?? []) (fn as Handler<GameEvents[K]>)(payload);
  }

  clear() {
    this.map.clear();
  }
}

export const events = new Bus();
