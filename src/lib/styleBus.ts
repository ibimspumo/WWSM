import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";

export const EVENT_STYLE = "wwsm:style";
export const EVENT_REQUEST_STYLE = "wwsm:request-style";

export type StyleSnapshot = Record<string, unknown>;

export async function broadcastStyle(snapshot: StyleSnapshot) {
  await emit(EVENT_STYLE, snapshot);
}

export async function requestStyle() {
  await emit(EVENT_REQUEST_STYLE);
}

export async function onStyle(handler: (s: StyleSnapshot) => void): Promise<UnlistenFn> {
  return listen<StyleSnapshot>(EVENT_STYLE, (e) => handler(e.payload));
}

export async function onRequestStyle(handler: () => void): Promise<UnlistenFn> {
  return listen(EVENT_REQUEST_STYLE, () => handler());
}
