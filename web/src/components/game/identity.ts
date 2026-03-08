"use client";

export const identityNameKey = "snl_player_name";
export const identityRoomKey = "snl_room_code";
export const identityPlayerIdKey = "snl_player_id";

export function readStoredValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(key) ?? "";
}

export function ensureStoredPlayerId() {
  if (typeof window === "undefined") {
    return "";
  }
  const existing = window.localStorage.getItem(identityPlayerIdKey);
  if (existing) {
    return existing;
  }
  const generated = crypto.randomUUID();
  window.localStorage.setItem(identityPlayerIdKey, generated);
  return generated;
}

export function persistIdentity(playerName: string, roomCode: string, playerId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(identityNameKey, playerName);
  window.localStorage.setItem(identityRoomKey, roomCode);
  window.localStorage.setItem(identityPlayerIdKey, playerId);
}

export function clearStoredIdentity() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(identityNameKey);
  window.localStorage.removeItem(identityRoomKey);
  window.localStorage.removeItem(identityPlayerIdKey);
}

export function resolvePlayerId(stateValue: string, setPlayerId: (value: string) => void) {
  if (stateValue.trim()) {
    return stateValue.trim();
  }
  const generated = ensureStoredPlayerId().trim();
  if (generated) {
    setPlayerId(generated);
  }
  return generated;
}
