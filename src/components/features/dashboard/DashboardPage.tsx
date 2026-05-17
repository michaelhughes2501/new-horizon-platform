// src/components/features/dashboard/DashboardPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { C, fonts } from '@styles/tokens';
import { useAuth } from '@context/AuthContext';
import { Card, PageHeader, Badge } from '@components/ui';

const ACTIVITY = [
  { day: 'Mon', actions: 4 },
  { day: 'Tue', actions: 7 },
  { day: 'Wed', actions: 5 },
  { day: 'Thu', actions: 9 },
  { day: 'Fri', actions: 6 },
  { day: 'Sat', actions: 11 },
  { day: 'Sun', actions: 8 },
];

const STATS = [
  { label: 'Connections', value: '—', icon: '✦', to: '/connect' },
  { label: 'Messages',    value: '—', icon: '✉', to: '/messages' },
  { label: 'Saved jobs',  value: '—', icon: '⬢', to: '/jobs' },
  { label: 'Profile',     value: '—', icon: '●', to: '/profile' },
];

const QUICK = [
  { to: '/connect',    label: 'Find connections', desc: 'Meet community members' },
  { to: '/jobs',       label: 'Browse jobs',       desc: 'Felony-friendly listings' },
  { to: '/resources',  label: 'Get resources',     desc: 'Housing, legal, health' },
  { to: '/calculator', label: 'Sentence calculator', desc: 'Estimate release dates' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const completion = user?.profile_complete ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your progress and community at a glance"
        action={<Badge color={C.success}>{user?.is_verified ? 'Verified' : 'Member'}</Badge>}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {STATS.map(s => (
          <Link key={s.label} to={s.to}>
            <Card style={{ transition: 'border-color .15s ease' }}>
              <div style={{ fontSize: 22, marginBottom: 8, color: C.gold }}>{s.icon}</div>
              <div style={{ fontFamily: fonts.display, fontSize: 28, color: C.charcoal }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: C.slate }}>{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card>
          <div style={{ fontFamily: fonts.display, fontSize: 19, color: C.charcoal, marginBottom: 14 }}>
            Weekly activity
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ACTIVITY}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.gold} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.mist} vertical={false} />
                <XAxis dataKey="day" stroke={C.slate} tickLine={false} fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="actions"
                  stroke={C.gold}
                  strokeWidth={2}
                  fill="url(#g)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: fonts.display, fontSize: 19, color: C.charcoal, marginBottom: 14 }}>
            Profile completion
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 44,
              color: C.gold,
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {completion}%
          </div>
          <div style={{ height: 8, background: C.mist, borderRadius: 9999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${completion}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: C.slate, marginTop: 12 }}>
            A complete profile helps you connect with more of the community.
          </p>
          <Link to="/profile">
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 500 }}>Edit profile →</span>
          </Link>
        </Card>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {QUICK.map(q => (
          <Link key={q.to} to={q.to}>
            <Card style={{ background: C.cream }}>
              <div style={{ fontWeight: 500, color: C.charcoal, marginBottom: 4 }}>{q.label}</div>
              <div style={{ fontSize: 12, color: C.slate }}>{q.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
