import type { ChatMessage, Peer } from "./types";
import type { PersonView } from "../hooks/useVoiceRoom";

const ts = (m: ChatMessage) => Date.parse(m.created_at);

const compare = (a: ChatMessage, b: ChatMessage) => ts(a) - ts(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Объединение по id: повторные доставки (ответ insert + realtime + повторная загрузка) не дублируются. */
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(compare);
}

export const removeMessage = (prev: ChatMessage[], id: string) =>
  prev.some((m) => m.id === id) ? prev.filter((m) => m.id !== id) : prev;

/**
 * Сверка с последней страницей с сервера после (пере)подключения.
 * Внутри окна страницы сервер главный: то, чего там нет, удалено, пока клиент был офлайн.
 * Старше окна не трогаем; новее окна оставляем (оно могло прийти после снимка).
 */
export function reconcileLatest(prev: ChatMessage[], fetched: ChatMessage[], pageSize: number): ChatMessage[] {
  if (fetched.length === 0) return prev;
  const sorted = [...fetched].sort(compare);
  const oldest = ts(sorted[0]);
  const newest = ts(sorted[sorted.length - 1]);
  const full = fetched.length >= pageSize; // страница полная: старее неё могут быть другие сообщения
  const keep = prev.filter((m) => (full && ts(m) < oldest) || ts(m) > newest);
  return mergeMessages(keep, sorted);
}

// ---------- присутствие ----------
/** То, что клиент публикует по сети: состояние + id соединения + время последнего изменения состояния. */
export type WirePeer = Peer & { conn?: string; ts?: number };

/**
 * Список «кто где» для экрана.
 * Свою строку берём из локального состояния: она не может отстать от того, что ты только что нажал.
 * Если у человека несколько соединений, запись из голосовой комнаты важнее записи
 * из лобби. При равном статусе берём запись с более свежим состоянием.
 */
export function resolvePeers(wire: WirePeer[], me: Peer): Peer[] {
  const best = new Map<string, WirePeer>();
  for (const p of wire) {
    if (!p.user_id || p.user_id === me.user_id) continue;
    const cur = best.get(p.user_id);
    if (!cur || (p.room !== null && cur.room === null) || (
      (p.room === null) === (cur.room === null) && (p.ts ?? 0) >= (cur.ts ?? 0)
    )) best.set(p.user_id, p);
  }
  const others = [...best.values()].map(({ conn: _c, ts: _t, ...peer }) => peer as Peer);
  return [me, ...others];
}

/** LiveKit знает фактический состав комнаты даже при пропуске обновления Presence. */
export function reconcileVoicePeers(peers: Peer[], people: PersonView[], room: string): Peer[] {
  const connected = new Set(people.map((person) => person.id));
  const byId = new Map(peers.map((peer) => [
    peer.user_id,
    peer.room === room && !connected.has(peer.user_id) ? { ...peer, room: null, streaming: false } : peer,
  ]));
  for (const person of people) {
    if (person.isLocal) continue;
    const lobby = byId.get(person.id);
    byId.set(person.id, {
      user_id: person.id,
      username: lobby?.username ?? person.name,
      room,
      streaming: person.sharing,
      muted: !person.micOn,
      deafened: lobby?.deafened ?? false,
      eco: lobby?.eco ?? false,
    });
  }
  return [...byId.values()];
}
