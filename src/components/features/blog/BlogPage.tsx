// src/components/features/blog/BlogPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { C, fonts } from '@styles/tokens';
import { blogApi } from '@lib/api';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { Card, PageHeader, Badge, Spinner, EmptyState, Avatar, Button, TextInput } from '@components/ui';
import type { BlogPost, BlogComment } from '@apptypes/app';

const CATEGORIES = ['All', 'Stories', 'Advice', 'News', 'Wellness'];

export default function BlogPage() {
  const { slug } = useParams<{ slug: string }>();
  return slug ? <BlogPostDetail slug={slug} /> : <BlogList />;
}

// ── List view ────────────────────────────────────────────────────
function BlogList() {
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
              cursor: 'pointer',
              transition: 'border-color .15s ease, background .15s ease',
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
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              style={{ display: 'block', outline: 'none' }}
              onFocus={e => {
                const card = e.currentTarget.firstElementChild as HTMLElement;
                if (card) {
                  card.style.transform = 'translateY(-2px)';
                  card.style.boxShadow = '0 8px 24px rgba(0,0,0,.10)';
                  card.style.borderColor = C.gold;
                }
              }}
              onBlur={e => {
                const card = e.currentTarget.firstElementChild as HTMLElement;
                if (card) {
                  card.style.transform = 'none';
                  card.style.boxShadow = 'none';
                  card.style.borderColor = C.mist;
                }
              }}
            >
              <Card
                style={{
                  cursor: 'pointer',
                  transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.10)';
                  e.currentTarget.style.borderColor = C.gold;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = C.mist;
                }}
              >
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail view (post + comments + like) ───────────────────────────
function BlogPostDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [post, setPost]       = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [liked, setLiked]     = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const [comments, setComments]   = useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [draft, setDraft]         = useState('');
  const [posting, setPosting]     = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    blogApi.getBySlug(slug).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else { setError(null); setPost(data); setLikesCount(data?.likes_count ?? 0); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    let active = true;
    setCommentsLoading(true);
    blogApi.getComments(post.id).then(({ data, error }) => {
      if (!active) return;
      if (!error) setComments(data ?? []);
      setCommentsLoading(false);
    });
    if (user) {
      blogApi.getLiked(user.id).then(likedIds => {
        if (active) setLiked(likedIds.includes(post.id));
      });
    } else {
      setLiked(false);
    }
    return () => { active = false; };
  }, [post, user]);

  const toggleLike = async () => {
    if (!user || !post) { toast('Sign in to like posts.', 'info'); return; }
    const { data, error } = await blogApi.toggleLike(user.id, post.id);
    if (error) { toast(error, 'error'); return; }
    setLiked(!!data);
    setLikesCount(c => (data ? c + 1 : Math.max(0, c - 1)));
  };

  const submitComment = async () => {
    if (!user || !post) { toast('Sign in to leave a comment.', 'info'); return; }
    if (!draft.trim()) return;
    setPosting(true);
    const { data, error } = await blogApi.addComment(user.id, post.id, draft);
    setPosting(false);
    if (error) { toast(error, 'error'); return; }
    if (data) setComments(prev => [...prev, data]);
    setDraft('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ minHeight: '100vh', background: C.ivory, padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
        <Card>
          <EmptyState
            icon="✎"
            title="Post not found"
            text="This story may have been removed, or Supabase isn't connected yet."
          />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => navigate('/blog')}>← Back to Community</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, padding: '28px 32px', maxWidth: 760, margin: '0 auto' }}>
      <Link to="/blog" style={{ fontSize: 13, color: C.slate, display: 'inline-block', marginBottom: 18 }}>
        ← Back to Community
      </Link>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Badge>{post.category}</Badge>
          {post.is_featured && <Badge color={C.gold}>Featured</Badge>}
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 32, color: C.charcoal, marginBottom: 10 }}>
          {post.emoji_icon} {post.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.slate, marginBottom: 18 }}>
          {post.author && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar initials={post.author.avatar_initials || post.author.name} size={24} />
              {post.author.name}
            </span>
          )}
          <span>· {post.read_time} min read</span>
        </div>
        <p style={{ fontSize: 15, color: C.charcoal, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {post.body}
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.mist}` }}>
          <Button
            size="sm"
            variant={liked ? 'primary' : 'secondary'}
            onClick={toggleLike}
          >
            {liked ? '♥' : '♡'} {likesCount}
          </Button>
          <Badge color={C.slate}>💬 {comments.length}</Badge>
        </div>
      </Card>

      <Card>
        <div style={{ fontFamily: fonts.display, fontSize: 19, color: C.charcoal, marginBottom: 14 }}>
          Comments
        </div>

        {commentsLoading ? (
          <Spinner size={22} />
        ) : comments.length === 0 ? (
          <p style={{ fontSize: 13, color: C.slate, marginBottom: 16 }}>
            No comments yet — be the first to respond.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                <Avatar initials={c.author?.avatar_initials || c.author?.name || '?'} size={30} />
                <div style={{ flex: 1, background: C.cream, borderRadius: 12, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.charcoal }}>
                    {c.author?.name ?? 'Member'}
                  </div>
                  <div style={{ fontSize: 13, color: C.charcoal }}>{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {user ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <TextInput
              style={{ flex: 1 }}
              placeholder="Add a comment…"
              value={draft}
              maxLength={1000}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
            />
            <Button onClick={submitComment} disabled={posting || !draft.trim()}>
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: C.slate }}>
            <Link to="/" style={{ color: C.gold, fontWeight: 500 }}>Sign in</Link> to join the conversation.
          </p>
        )}
      </Card>
    </div>
  );
}
