import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { GameSnapshot } from "./game.svelte";

export const EVENT_STATE = "wwsm:state";
export const EVENT_REQUEST_STATE = "wwsm:request-state";

export async function broadcastState(snapshot: GameSnapshot) {
  await emit(EVENT_STATE, snapshot);
}

export async function requestState() {
  await emit(EVENT_REQUEST_STATE);
}

export async function onState(handler: (s: GameSnapshot) => void): Promise<UnlistenFn> {
  return listen<GameSnapshot>(EVENT_STATE, (e) => handler(e.payload));
}

export async function onRequestState(handler: () => void): Promise<UnlistenFn> {
  return listen(EVENT_REQUEST_STATE, () => handler());
}
