// src/components/features/profile/ProfilePage.tsx
import React, { useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { profileApi } from '@lib/api';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { Card, PageHeader, Avatar, Button, Field, inputStyle, Badge } from '@components/ui';
import type { ProfileFormData } from '@types/app';

const STATES = ['TX', 'CA', 'FL', 'NY', 'GA', 'IL', 'OH', 'PA', 'NC', 'MI'];
const OFFENSES = ['non-violent', 'violent', 'drug', 'financial', 'prefer_not_to_say'];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ProfileFormData>({
    name:      user?.name ?? '',
    age:       user?.age ? String(user.age) : '',
    state:     user?.state ?? STATES[0],
    bio:       user?.bio ?? '',
    offense:   user?.offense_type ?? 'prefer_not_to_say',
    interests: (user?.interests ?? []).join(', '),
    phone:     '',
  });

  const set = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await profileApi.update(user.id, form);
    setSaving(false);
    if (error) { toast(error, 'error'); return; }
    toast('Profile updated.', 'success');
    refreshUser();
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader
        title="Profile"
        subtitle="Manage how the community sees you"
        action={<Badge color={user.is_verified ? C.success : C.slate}>
          {user.is_verified ? 'Verified' : 'Unverified'}
        </Badge>}
      />

      <Card style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar initials={user.avatar_initials || user.name} size={64} />
        <div>
          <div style={{ fontFamily: fonts.display, fontSize: 22, color: C.charcoal }}>
            {user.name}
          </div>
          <div style={{ fontSize: 13, color: C.slate }}>{user.email}</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
            Profile {user.profile_complete}% complete
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Name">
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Age">
            <input
              style={inputStyle}
              type="number"
              value={form.age}
              onChange={e => set('age', e.target.value)}
            />
          </Field>
          <Field label="State">
            <select style={inputStyle} value={form.state} onChange={e => set('state', e.target.value)}>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Offense category (private)">
            <select style={inputStyle} value={form.offense} onChange={e => set('offense', e.target.value)}>
              {OFFENSES.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Bio">
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            value={form.bio}
            maxLength={500}
            onChange={e => set('bio', e.target.value)}
          />
        </Field>

        <Field label="Interests (comma separated)">
          <input
            style={inputStyle}
            value={form.interests}
            onChange={e => set('interests', e.target.value)}
            placeholder="music, fitness, cooking"
          />
        </Field>

        <Button size="lg" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Card>
    </div>
  );
}
