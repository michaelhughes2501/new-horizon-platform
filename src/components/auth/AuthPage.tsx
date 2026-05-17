// src/components/auth/AuthPage.tsx
import React, { useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { Button, Field, inputStyle } from '@components/ui';
import Security from '@lib/security';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [mode, setMode]       = useState<Mode>('login');
  const [busy, setBusy]       = useState(false);
  const [email, setEmail]     = useState('');
  const [name, setName]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const pw = Security.checkPwStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!Security.isValidEmail(email)) {
      toast('Enter a valid email address.', 'error');
      return;
    }

    if (mode === 'register') {
      if (Security.sanitise(name, 60).length < 2) {
        toast('Please enter your name.', 'error');
        return;
      }
      if (pw.score < 2) {
        toast('Choose a stronger password.', 'error');
        return;
      }
      if (password !== confirm) {
        toast('Passwords do not match.', 'error');
        return;
      }
    }

    setBusy(true);
    const err =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, name, password);
    setBusy(false);

    if (err) {
      toast(err, 'error');
    } else {
      toast(mode === 'login' ? 'Welcome back.' : 'Account created.', 'success');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: C.charcoal,
      }}
    >
      {/* Brand panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 64px',
          background: `linear-gradient(160deg, ${C.charcoal}, #2a2a2e)`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            marginBottom: 26,
          }}
        >
          ✦
        </div>
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 46,
            color: C.white,
            fontWeight: 600,
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          A new horizon
          <br />
          starts here.
        </h1>
        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 15, maxWidth: 420 }}>
          A community platform for returning citizens — connection, jobs,
          resources, and a fresh start. Built with dignity.
        </p>
      </div>

      {/* Form panel */}
      <div
        style={{
          width: 460,
          background: C.ivory,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 48px',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 500,
                background: mode === m ? C.white : 'transparent',
                color: mode === m ? C.charcoal : C.slate,
                border: `1px solid ${mode === m ? C.mist : 'transparent'}`,
              }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <Field label="Full name">
              <input
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jordan Rivera"
              />
            </Field>
          )}

          <Field label="Email">
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password">
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {mode === 'register' && password.length > 0 && (
            <div style={{ marginTop: -6, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: i < pw.score ? pw.color : C.mist,
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: pw.color }}>
                {pw.label}
                {pw.tips.length > 0 && ` — ${pw.tips[0]}`}
              </div>
            </div>
          )}

          {mode === 'register' && (
            <Field label="Confirm password">
              <input
                style={inputStyle}
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          )}

          <div style={{ marginTop: 8 }}>
            <Button type="submit" fullWidth size="lg" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </Button>
          </div>
        </form>

        <p style={{ fontSize: 12, color: C.slate, marginTop: 18, textAlign: 'center' }}>
          By continuing you agree to our community guidelines.
        </p>
      </div>
    </div>
  );
}
