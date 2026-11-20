import type { ChatMessage } from "./types";

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
