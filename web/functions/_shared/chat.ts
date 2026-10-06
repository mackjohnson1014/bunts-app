/**
 * A plain chat between the two owners, for everything that isn't a specific
 * roster move (those are suggestions, with their own threads).
 *
 * Storage: each person's messages live under their own KV key, and only they
 * ever write it. Two people writing one shared list would race -- KV has no
 * transactions, and a read-modify-write from each side within a few seconds
 * drops a message. Reading merges everyone's lists by time; there are two of
 * you, so that's two or three reads.
 *
 * Pushes are rationed: only a message that opens a conversation (nothing for
 * two hours) notifies the other person -- see CHAT_PUSH_AFTER_QUIET_MS. An
 * open chat polls every few seconds; a pushed message also carries its text
 * so the open app can show it before KV, which can lag up to a minute
 * between locations, catches up.
 */

const MSGS = 'chat:msgs:';
const MEMBERS = 'chat:members';
const READ = 'chat:read:';
const KEEP_PER_PERSON = 400;
export const CHAT_MAX = 1000;

export interface ChatMessage {
  id: string;
  email: string;
  name: string;
  text: string;
  at: string;
}

async function members(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get(MEMBERS);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function own(kv: KVNamespace, email: string): Promise<ChatMessage[]> {
  const raw = await kv.get(MSGS + email);
  return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
}

/** Everyone's messages, oldest first, the most recent `limit`. */
export async function listChat(kv: KVNamespace, limit = 300): Promise<ChatMessage[]> {
  const all = (await Promise.all((await members(kv)).map((e) => own(kv, e)))).flat();
  return all.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)).slice(-limit);
}

/**
 * A chat push only goes out when the conversation has been quiet this long.
 * Every message buzzing the other phone is too much for back-and-forth; one
 * "Mack sent you a message" to open a conversation is the point. The tab badge
 * still counts everything unread.
 */
export const CHAT_PUSH_AFTER_QUIET_MS = 2 * 3600_000;

export async function postChat(
  kv: KVNamespace, who: { email: string; name: string }, text: string,
): Promise<{ message: ChatMessage; opensConversation: boolean }> {
  // Last message from anyone, before this one.
  const before = (await listChat(kv, 1))[0];
  const msg: ChatMessage = {
    id: crypto.randomUUID(), email: who.email, name: who.name, text: text.trim(), at: new Date().toISOString(),
  };
  const mine = await own(kv, who.email);
  await kv.put(MSGS + who.email, JSON.stringify([...mine, msg].slice(-KEEP_PER_PERSON)));
  // Register as a member the first time. Re-checked on every post, so a lost
  // write here heals itself on the next message.
  const list = await members(kv);
  if (!list.includes(who.email)) await kv.put(MEMBERS, JSON.stringify([...list, who.email]));
  // Sending implies you've read everything up to now.
  await kv.put(READ + who.email, msg.at);
  const opensConversation = !before || Date.parse(msg.at) - Date.parse(before.at) >= CHAT_PUSH_AFTER_QUIET_MS;
  return { message: msg, opensConversation };
}

export const lastRead = (kv: KVNamespace, email: string) => kv.get(READ + email);

export async function markRead(kv: KVNamespace, email: string, at = new Date().toISOString()): Promise<void> {
  await kv.put(READ + email, at);
}

/** Messages from other people since you last had the chat open. */
export async function unreadCount(kv: KVNamespace, email: string): Promise<number> {
  const [since, msgs] = await Promise.all([lastRead(kv, email), listChat(kv, KEEP_PER_PERSON)]);
  return msgs.filter((m) => m.email !== email && (!since || m.at > since)).length;
}

export const isChatText = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= CHAT_MAX;
