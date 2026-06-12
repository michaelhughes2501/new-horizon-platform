// src/components/features/blog/BlogPage.tsx
import React, { useEffect, useState } from 'react';
import { C, fonts } from '@styles/tokens';
import { blogApi } from '@lib/api';
import { Card, PageHeader, Badge, Spinner, EmptyState, Avatar } from '@components/ui';
import type { BlogPost } from '@types/app';

const CATEGORIES = ['All', 'Stories', 'Advice', 'News', 'Wellness'];

export default function BlogPage() {
  const [posts, setPosts]     = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let active = true;
    setLoading(true);
    blogApi.getPosts(category).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setPosts(data ?? []); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [category]);

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        title="Community"
        subtitle="Stories, advice, and news from members"
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              padding: '7px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${category === c ? C.gold : C.mist}`,
              background: category === c ? C.gold : C.white,
              color: category === c ? C.white : C.slate,
            }}
          >
            {c}
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
            icon="✎"
            title="Posts will appear here"
            text="Connect a live Supabase project to load the community blog."
          />
        </Card>
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState title="No posts yet" text="Be the first to share your story." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(post => (
            <Card key={post.id}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ fontSize: 30 }}>{post.emoji_icon || '✎'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge>{post.category}</Badge>
                    {post.is_featured && <Badge color={C.gold}>Featured</Badge>}
                  </div>
                  <h2 style={{ fontFamily: fonts.display, fontSize: 21, color: C.charcoal }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p style={{ fontSize: 13, color: C.slate, margin: '6px 0 10px' }}>
                      {post.excerpt}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.slate }}>
                    {post.author && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar initials={post.author.avatar_initials || post.author.name} size={22} />
                        {post.author.name}
                      </span>
                    )}
                    <span>· {post.read_time} min read</span>
                    <span>· ♥ {post.likes_count}</span>
                    <span>· 💬 {post.comments_count}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
