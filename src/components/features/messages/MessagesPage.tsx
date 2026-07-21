// src/components/features/messages/MessagesPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { C } from '@styles/tokens';
import { messageApi } from '@lib/api';
import { subscribeToMessages } from '@lib/database/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { Card, PageHeader, Spinner, EmptyState, Button, TextInput } from '@components/ui';
import type { Conversation, Message } from '@apptypes/app';

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { id: activeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);

  const openConversation = (id: string) => navigate(`/messages/${id}`);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error } = await messageApi.getConversations(userId);
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setConversations(data ?? []); }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!activeId) {
      setMessages([]);
      return () => { active = false; };
    }
    messageApi.getMessages(activeId).then(({ data }) => {
      if (active) setMessages(data ?? []);
    });
    if (user) messageApi.markRead(activeId, user.id).catch(() => {});
    const unsub = subscribeToMessages(activeId, msg => {
      if (active) setMessages(prev => [...prev, msg as unknown as Message]);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [activeId, user]);

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
                  onClick={() => openConversation(c.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 10,
                    background: activeId === c.id ? C.cream : 'transparent',
                    cursor: 'pointer',
                    transition: 'background .12s ease, box-shadow .12s ease',
                    outline: 'none',
                  }}
                  onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = C.ivory; }}
                  onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = 'transparent'; }}
                  onFocus={e => {
                    if (activeId !== c.id) e.currentTarget.style.background = C.ivory;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${C.gold}33`;
                  }}
                  onBlur={e => {
                    if (activeId !== c.id) e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
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
                  <TextInput
                    style={{ flex: 1 }}
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
