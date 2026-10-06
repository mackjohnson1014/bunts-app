import type { ChatMessage } from './types';

/** In-memory chat for the sample-data preview. Resets on reload. */
const ME = { email: 'you@example.com', name: 'You' };
const MATT = { email: 'matt@example.com', name: 'Matt' };
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

let messages: ChatMessage[] = [
  { id: 'c1', ...MATT, text: 'You see Ackley went 7 innings with 9 Ks yesterday?', at: ago(60 * 26) },
  { id: 'c2', ...ME, text: 'Yeah. If he’s still out there tonight we should grab him.', at: ago(60 * 25.5) },
  { id: 'c3', ...MATT, text: 'Put a pickup in for him. Kirilenko’s the obvious drop.', at: ago(95) },
  { id: 'c4', ...MATT, text: 'Also — are we keeping Brannigan next year or what', at: ago(12) },
];
let readAt: string | null = ago(30);

export const mockChat = {
  list: () => ({ messages: [...messages], readAt }),
  send(text: string): ChatMessage {
    const m = { id: `c-${Date.now()}`, ...ME, text: text.trim(), at: new Date().toISOString() };
    messages = [...messages, m];
    readAt = m.at;
    return m;
  },
  read() { readAt = new Date().toISOString(); },
  unread: () => messages.filter((m) => m.email !== ME.email && (!readAt || m.at > readAt)).length,
};
