// src/components/features/connect/ConnectPage.tsx
import React, { useEffect, useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { profileApi, connectionApi } from '@lib/api';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import {
  Card,
  PageHeader,
  Avatar,
  Badge,
  Button,
  Spinner,
  EmptyState,
  inputStyle,
} from '@components/ui';
import type { PublicProfile } from '@apptypes/app';

const STATE_OPTIONS = ['All', 'TX', 'CA', 'FL', 'NY', 'GA', 'IL', 'OH', 'PA', 'NC', 'MI'];

export default function ConnectPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [liked, setLiked]       = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState('All');

  useEffect(() => {
    let active = true;
    setLoading(true);
    profileApi.getPublic({ state: stateFilter }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setProfiles(data ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [stateFilter]);

  useEffect(() => {
    if (user) connectionApi.getLiked(user.id).then(setLiked);
  }, [user]);

  const toggleLike = async (id: string) => {
    if (!user) return;
    const { data, error } = await connectionApi.toggleLike(user.id, id);
    if (error) { toast(error, 'error'); return; }
    setLiked(prev => (data ? [...prev, id] : prev.filter(x => x !== id)));
    toast(data ? 'Profile liked.' : 'Like removed.', 'success');
  };

  return (
    <div>
      <PageHeader
        title="Connect"
        subtitle="Meet members of the community"
        action={
          <select
            style={{ ...inputStyle, width: 140 }}
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
          >
            {STATE_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All states' : s}</option>
            ))}
          </select>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner />
        </div>
      ) : error ? (
        <Card>
          <EmptyState
            icon="✦"
            title="Members will appear here"
            text="Connect a live Supabase project to discover community members."
          />
        </Card>
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState title="No members found" text="Try a different state filter." />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {profiles.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar initials={p.avatar_initials || p.name} size={48} />
                <div>
                  <div style={{ fontWeight: 500, color: C.charcoal }}>
                    {p.name}
                    {p.is_verified && <span style={{ color: C.info, marginLeft: 5 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.slate }}>
                    {p.state ?? '—'} · {p.last_seen_label}
                  </div>
                </div>
              </div>

              {p.bio && (
                <p
                  style={{
                    fontSize: 13,
                    color: C.slate,
                    marginBottom: 12,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.bio}
                </p>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {(p.interests ?? []).slice(0, 3).map(i => (
                  <Badge key={i}>{i}</Badge>
                ))}
              </div>

              <Button
                fullWidth
                size="sm"
                variant={liked.includes(p.id) ? 'secondary' : 'primary'}
                onClick={() => toggleLike(p.id)}
              >
                {liked.includes(p.id) ? '♥ Liked' : '♡ Like to connect'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
