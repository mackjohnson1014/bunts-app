import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { ChatMessage } from '../types';
import { partnerName } from '../Suggestions';

/** How often the open chat checks for new messages; pushes cover the rest. */
const POLL_MS = 5_000;

/**
 * A plain chat between the two owners -- for the conversation around the
 * roster that isn't one specific move (moves are suggestions, with their own
 * threads). New messages push the other person; the open screen polls.
 */
export default function Chat({
  me, incoming, onRead,
}: {
  /** Your email, to tell your messages from theirs. */
  me: string | null;
  /** A message that arrived by push while the app was open, shown before the server catches up. */
  incoming: ChatMessage | null;
  /** Tell the app the badge can clear. */
  onRead: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Merge by id, so polled, pushed and just-sent copies of a message don't double up.
  const merge = (incomingList: ChatMessage[]) =>
    setMessages((cur) => {
      const byId = new Map((cur ?? []).map((m) => [m.id, m]));
      for (const m of incomingList) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
    });

  useEffect(() => {
    let alive = true;
    const load = async (first: boolean) => {
      if (document.visibilityState !== 'visible' && !first) return;
      try {
        const res = await api.getChat();
        if (!alive) return;
        merge(res.messages);
        if (first) setReadAt(res.readAt);
        setError(null);
        void api.markChatRead().then(onRead).catch(() => {});
      } catch (e) {
        if (alive && first) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void load(true);
    const id = setInterval(() => void load(false), POLL_MS);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (incoming) { merge([incoming]); void api.markChatRead().then(onRead).catch(() => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  // Stay at the bottom as messages arrive, unless they've scrolled up to read back.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.sendChat(body);
      merge([res.message]);
      setText('');
      pinned.current = true;
      // Mid-conversation messages don't notify (by design), so there's nothing
      // to report. Only say something when a notification was due and didn't land.
      setNote(!res.pushed || (res.notified ?? 0) > 0 ? null : res.skipped
        ? `${partner} has chat alerts off, so they didn’t get a notification.`
        : `${partner} has no phone set up for alerts — they’ll see it next time they open Bunts.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setSending(false);
  }

  const list = messages ?? [];
  // Known from suggestions if Home has loaded them; otherwise from their messages here.
  const known = partnerName(null);
  const partner = known !== 'your co-owner' ? known
    : list.find((m) => m.email !== me)?.name.split(' ')[0] ?? known;

  return (
    <div className="chat">
      <div className="chat-head">
        <h1 className="screen-title">Chat</h1>
        <p className="screen-sub">
          You and {partner}. {partner} gets a notification for the first message after a couple of quiet hours, not every one.
        </p>
      </div>

      <div
        className="chat-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {messages === null && !error ? <p className="muted chat-empty">Loading…</p> : null}
        {messages !== null && list.length === 0 ? (
          <p className="muted chat-empty">No messages yet. Say something to {partner}.</p>
        ) : null}
        {list.map((m, i) => {
          const prev = list[i - 1];
          const mine = m.email === me;
          const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
          const grouped = !newDay && prev && prev.email === m.email && Date.parse(m.at) - Date.parse(prev.at) < 5 * 60_000;
          const firstUnread = readAt && !mine && m.at > readAt && (!prev || prev.at <= readAt || prev.email === me);
          return (
            <div key={m.id}>
              {newDay ? <p className="chat-day">{dayLabel(m.at)}</p> : null}
              {firstUnread ? <p className="chat-new">New</p> : null}
              <div className={`bubble-row ${mine ? 'mine' : 'theirs'}${grouped ? ' grouped' : ''}`}>
                {!grouped ? (
                  <span className="bubble-meta">{mine ? 'You' : m.name.split(' ')[0]} · {time(m.at)}</span>
                ) : null}
                <div className="bubble">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-compose">
        {error ? <p className="chat-error">{error}</p> : note ? <p className="chat-note">{note}</p> : null}
        <div className="chat-bar">
          <textarea
            className="chat-input"
            placeholder={`Message ${partner}`}
            value={text}
            rows={1}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a keyboard; Shift+Enter is a new line. Phones keep Return as a line break.
              if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); void send(); }
            }}
          />
          <button className="chat-send" onClick={() => void send()} disabled={!text.trim() || sending} aria-label="Send">
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

const dayKey = (iso: string) => new Date(iso).toDateString();
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
