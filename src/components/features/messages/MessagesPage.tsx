// src/components/features/messages/MessagesPage.tsx
import React, { useEffect, useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { messageApi } from '@lib/api';
import { subscribeToMessages } from '@lib/database/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { Card, PageHeader, Spinner, EmptyState, Button, inputStyle } from '@components/ui';
import type { Conversation, Message } from '@apptypes/app';

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    messageApi.getConversations(user.id).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setConversations(data ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!activeId) return;
    messageApi.getMessages(activeId).then(({ data }) => setMessages(data ?? []));
    const unsub = subscribeToMessages(activeId, msg => {
      setMessages(prev => [...prev, msg as unknown as Message]);
    });
    return unsub;
  }, [activeId]);

  const send = async () => {
    if (!user || !activeId || !draft.trim()) return;
    setSending(true);
    const { data, error } = await messageApi.send(user.id, activeId, draft);
    setSending(false);
    if (error) { toast(error, 'error'); return; }
    if (data) setMessages(prev => [...prev, data]);
    setDraft('');
  };

  return (
    <div>
      <PageHeader title="Messages" subtitle="Real-time conversations with connections" />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner />
        </div>
      ) : error ? (
        <Card>
          <EmptyState
            icon="✉"
            title="Messages will appear here"
            text="Connect a live Supabase project to enable real-time messaging."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, height: 540 }}>
          <Card style={{ padding: 8, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <EmptyState title="No conversations" text="Connect with members to start chatting." />
            ) : (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 10,
                    background: activeId === c.id ? C.cream : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 500, color: C.charcoal, fontSize: 14 }}>
                    {c.peer?.name ?? 'Conversation'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.slate,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.last_message ?? 'No messages yet'}
                  </div>
                </button>
              ))
            )}
          </Card>

          <Card style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
            {!activeId ? (
              <div style={{ margin: 'auto' }}>
                <EmptyState title="Select a conversation" />
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.length === 0 ? (
                    <div style={{ margin: 'auto', color: C.slate, fontSize: 13 }}>
                      No messages yet — say hello.
                    </div>
                  ) : (
                    messages.map(m => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: mine ? 'flex-end' : 'flex-start',
                            background: mine ? C.gold : C.cream,
                            color: mine ? C.white : C.charcoal,
                            padding: '8px 12px',
                            borderRadius: 12,
                            maxWidth: '70%',
                            fontSize: 13,
                          }}
                        >
                          {m.body}
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${C.mist}` }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Type a message…"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(); }}
                  />
                  <Button onClick={send} disabled={sending || !draft.trim()}>
                    Send
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
