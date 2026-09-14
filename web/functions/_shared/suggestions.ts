const KEY = 'suggestions';
const KEEP = 50;

export interface Suggestion {
  id: string;
  authorEmail: string;
  authorName: string;
  playerKey: string;
  playerName: string;
  recommendation: 'start' | 'sit' | 'watch';
  note: string;
  createdAt: string;
  /** Emails that have marked it read, so "new" means new to *you*. */
  seenBy: string[];
}

export interface SuggestionInput {
  playerKey: string;
  playerName: string;
  recommendation: Suggestion['recommendation'];
  note: string;
}

export function isSuggestionInput(v: unknown): v is SuggestionInput {
  const s = v as SuggestionInput;
  return (
    !!s &&
    typeof s.playerKey === 'string' && s.playerKey.length > 0 && s.playerKey.length < 80 &&
    typeof s.playerName === 'string' && s.playerName.length > 0 && s.playerName.length < 80 &&
    (s.recommendation === 'start' || s.recommendation === 'sit' || s.recommendation === 'watch') &&
    typeof s.note === 'string' && s.note.length <= 280
  );
}

export async function listSuggestions(kv: KVNamespace): Promise<Suggestion[]> {
  const raw = await kv.get(KEY);
  return raw ? (JSON.parse(raw) as Suggestion[]) : [];
}

export async function addSuggestion(
  kv: KVNamespace,
  input: SuggestionInput,
  author: { email: string; name: string },
): Promise<Suggestion> {
  const all = await listSuggestions(kv);
  const suggestion: Suggestion = {
    id: crypto.randomUUID(),
    authorEmail: author.email,
    authorName: author.name,
    playerKey: input.playerKey,
    playerName: input.playerName,
    recommendation: input.recommendation,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
    // The author has, by definition, seen their own suggestion.
    seenBy: [author.email],
  };
  // Newest first, and bounded -- this is a conversation between two people, not an archive.
  await kv.put(KEY, JSON.stringify([suggestion, ...all].slice(0, KEEP)));
  return suggestion;
}

export async function markSeen(kv: KVNamespace, email: string): Promise<void> {
  const all = await listSuggestions(kv);
  let changed = false;
  for (const s of all) {
    if (!s.seenBy.includes(email)) { s.seenBy.push(email); changed = true; }
  }
  if (changed) await kv.put(KEY, JSON.stringify(all));
}
