// src/components/features/resources/ResourcesPage.tsx
import React, { useEffect, useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { resourceApi } from '@lib/api';
import { Card, PageHeader, Badge, Button, Spinner, EmptyState } from '@components/ui';
import type { Resource, ResourceCategory } from '@apptypes/app';

const CATEGORIES: { key: ResourceCategory; label: string; icon: string }[] = [
  { key: 'parole',     label: 'Parole & Probation', icon: '⚖' },
  { key: 'mental',     label: 'Mental Health',      icon: '✦' },
  { key: 'housing',    label: 'Housing',            icon: '⌂' },
  { key: 'education',  label: 'Education',          icon: '✎' },
  { key: 'employment', label: 'Employment',         icon: '⬢' },
  { key: 'legal',      label: 'Legal Aid',          icon: '§' },
];

export default function ResourcesPage() {
  const [category, setCategory] = useState<ResourceCategory>('parole');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    resourceApi.getByCategory(category).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setResources(data ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [category]);

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Resources"
        subtitle="Support for housing, health, legal aid, and reentry"
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${category === c.key ? C.gold : C.mist}`,
              background: category === c.key ? C.gold : C.white,
              color: category === c.key ? C.white : C.slate,
            }}
          >
            <span>{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner />
        </div>
      ) : error ? (
        <Card>
          <EmptyState
            icon="⚲"
            title="Resources will appear here"
            text="Connect a live Supabase project to load the resource directory."
          />
        </Card>
      ) : resources.length === 0 ? (
        <Card>
          <EmptyState title="No resources yet" text="Check another category." />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {resources.map(r => (
            <Card key={r.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{r.icon_emoji || '⚲'}</span>
                <div style={{ fontFamily: fonts.display, fontSize: 17, color: C.charcoal }}>
                  {r.name}
                </div>
              </div>
              {r.is_urgent && <Badge color={C.rose}>Urgent help</Badge>}
              {r.description && (
                <p style={{ fontSize: 13, color: C.slate, margin: '10px 0' }}>{r.description}</p>
              )}
              {r.phone && (
                <div style={{ fontSize: 13, color: C.charcoal }}>☎ {r.phone}</div>
              )}
              {r.url && (
                <a href={r.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="secondary" style={{ marginTop: 10 }}>
                    Visit website →
                  </Button>
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
