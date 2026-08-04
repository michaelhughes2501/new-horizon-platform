/**
 * AI Chatbot — floating support widget.
 * Rendered once, globally, inside <AppLayout> for every authenticated page.
 */

import React, { useState, useRef, useEffect } from 'react';
import { C, fonts, radii, shadows } from '@styles/tokens';
import { useToast } from '@context/ToastContext';
import Security from '@lib/security';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  context?: 'general' | 'support' | 'matching' | 'resources';
}

const WELCOME: Message = {
  id: '1',
  role: 'assistant',
  content: "Hi! I'm here to help. How can I assist you today?",
  timestamp: new Date(),
};

export const AIChatbot: React.FC<ChatbotProps> = ({ context = 'general' }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const cleanInput = Security.sanitise(input, 2000);
    if (!cleanInput) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cleanInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanInput, context }),
      });

      if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: data.reply || "I couldn't come up with a reply — try rephrasing that?",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast('The assistant is unavailable right now.', 'error');
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 9500 }}>
      {open && (
        <div
          style={{
            width: 340,
            height: 460,
            marginBottom: 14,
            background: C.white,
            borderRadius: radii['2xl'],
            boxShadow: shadows['2xl'],
            border: `1px solid ${C.mist}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn .15s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
              color: C.white,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 600 }}>
              AI Assistant
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{
                color: C.white,
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
                borderRadius: radii.full,
                transition: 'background .12s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(message => (
              <div
                key={message.id}
                style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    fontSize: 13,
                    background: message.role === 'user' ? C.gold : C.cream,
                    color: message.role === 'user' ? C.white : C.charcoal,
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: C.cream, color: C.slate, padding: '8px 12px', borderRadius: 12, fontSize: 13 }}>
                  …
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${C.mist}`, flexShrink: 0 }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message…"
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: radii.md,
                border: `1px solid ${C.mist}`,
                background: C.ivory,
                color: C.charcoal,
                fontFamily: fonts.body,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '9px 16px',
                borderRadius: radii.md,
                background: C.gold,
                color: C.white,
                fontSize: 13,
                fontWeight: 500,
                opacity: loading || !input.trim() ? 0.55 : 1,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          color: C.white,
          fontSize: 24,
          boxShadow: shadows.xl,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
          transition: 'transform .12s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
      >
        {open ? '✕' : '✦'}
      </button>
    </div>
  );
};

export default AIChatbot;
