// src/lib/api/index.ts
// ─────────────────────────────────────────────────────────────
// All database API calls go through here.
// Returns { data, error } — never throws.
// Components never import supabase directly.
// ─────────────────────────────────────────────────────────────
import supabase from '@lib/database/supabase';
import Security from '@lib/security';
import type {
  Profile, PublicProfile, Job, JobApplication,
  BlogPost, BlogComment, Notification,
  Resource, ResourceCategory, Connection,
  Conversation, Message, ApiResponse,
  ProfileFormData, JobApplicationForm,
} from '@apptypes/app';

// ════════════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════════════
export const authApi = {

  async signIn(email: string, password: string): Promise<ApiResponse<Profile>> {
    const rl = Security.checkLimit('login', email);
    if (!rl.ok) {
      Security.audit('RATE_LIMIT', undefined, { action: 'login', email });
      return { data: null, error: rl.message ?? 'Rate limit exceeded.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Security.audit('LOGIN_FAIL', undefined, { email });
      return { data: null, error: error.message };
    }
    const profile = await profileApi.getById(data.user.id);
    if (!profile.data) return { data: null, error: 'Profile not found.' };
    if (profile.data.is_banned) {
      await supabase.auth.signOut();
      return { data: null, error: 'This account has been suspended.' };
    }
    Security.audit('LOGIN_SUCCESS', data.user.id, {});
    return { data: profile.data, error: null };
  },

  async signUp(email: string, name: string, password: string): Promise<ApiResponse<Profile>> {
    const rl = Security.checkLimit('register', email);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const cleanName = Security.sanitise(name, 60);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: cleanName } },
    });
    if (error) return { data: null, error: error.message };
    if (!data.user) return { data: null, error: 'Signup failed.' };

    // Profile is auto-created by DB trigger trg_on_auth_user_created
    // Wait briefly then fetch
    await new Promise(r => setTimeout(r, 500));
    const profile = await profileApi.getById(data.user.id);
    Security.audit('SIGNUP', data.user.id, { email });
    return profile;
  },

  async signOut(): Promise<void> {
    const { data } = await supabase.auth.getUser();
    if (data.user) Security.audit('LOGOUT', data.user.id, {});
    await supabase.auth.signOut();
    Security.clearSession();
  },

  async getSession(): Promise<ApiResponse<Profile>> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return { data: null, error: null };
    return profileApi.getById(data.session.user.id);
  },

  async resetPassword(email: string): Promise<ApiResponse<boolean>> {
    const rl = Security.checkLimit('passwordReset', email);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/auth/reset-password`,
    });
    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  },

  async updatePassword(newPassword: string): Promise<ApiResponse<boolean>> {
    const { score } = Security.checkPwStrength(newPassword);
    if (score < 2) return { data: null, error: 'Password is too weak.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { data: null, error: error.message };
    const { data } = await supabase.auth.getUser();
    if (data.user) Security.audit('PASSWORD_CHANGED', data.user.id, {});
    return { data: true, error: null };
  },
};

// ════════════════════════════════════════════════════════════════
// PROFILES API
// ════════════════════════════════════════════════════════════════
export const profileApi = {

  async getById(id: string): Promise<ApiResponse<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Profile, error: null };
  },

  async getPublic(filters: { state?: string; interest?: string } = {}): Promise<ApiResponse<PublicProfile[]>> {
    let query = supabase
      .from('v_public_profiles')
      .select('*')
      .neq('id', (await supabase.auth.getUser()).data.user?.id ?? '');

    if (filters.state && filters.state !== 'All') {
      query = query.eq('state', filters.state);
    }
    if (filters.interest && filters.interest !== 'All') {
      query = query.contains('interests', [filters.interest]);
    }

    const { data, error } = await query.order('last_seen', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as PublicProfile[], error: null };
  },

  async update(userId: string, form: Partial<ProfileFormData>): Promise<ApiResponse<Profile>> {
    const rl = Security.checkLimit('profileUpdate', userId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const updates: Record<string, unknown> = {};
    if (form.name !== undefined) {
      const n = Security.sanitise(form.name, 60);
      if (n.length < 2) return { data: null, error: 'Name must be at least 2 characters.' };
      updates.name = n;
    }
    if (form.age !== undefined) {
      const age = parseInt(form.age, 10);
      if (isNaN(age) || age < 18 || age > 99) return { data: null, error: 'Age must be between 18 and 99.' };
      updates.age = age;
    }
    if (form.state !== undefined) updates.state = form.state;
    if (form.bio !== undefined) {
      const bio = Security.sanitise(form.bio, 500);
      if (bio.length > 500) return { data: null, error: 'Bio must be 500 characters or less.' };
      updates.bio = bio;
    }
    if (form.offense !== undefined) updates.offense_type = form.offense;
    if (form.interests !== undefined) {
      updates.interests = form.interests.split(',').map(i => Security.sanitise(i.trim(), 30)).filter(Boolean);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    Security.audit('PROFILE_UPDATE', userId, { fields: Object.keys(updates) });
    return { data: data as Profile, error: null };
  },

  async updateLastSeen(userId: string): Promise<void> {
    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  },
};

// ════════════════════════════════════════════════════════════════
// CONNECTIONS API
// ════════════════════════════════════════════════════════════════
export const connectionApi = {

  async getForUser(userId: string): Promise<ApiResponse<Connection[]>> {
    const { data, error } = await supabase
      .from('connections')
      .select('*, requester:profiles!requester_id(id,name,avatar_initials,state,is_verified), recipient:profiles!recipient_id(id,name,avatar_initials,state,is_verified)')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('status', 'accepted');
    if (error) return { data: null, error: error.message };
    return { data: data as Connection[], error: null };
  },

  async connect(requesterId: string, recipientId: string): Promise<ApiResponse<Connection>> {
    const rl = Security.checkLimit('like', requesterId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const { data, error } = await supabase
      .from('connections')
      .insert({ requester_id: requesterId, recipient_id: recipientId, status: 'accepted' })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Connection, error: null };
  },

  async remove(requesterId: string, recipientId: string): Promise<ApiResponse<boolean>> {
    const { error } = await supabase
      .from('connections')
      .delete()
      .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`);
    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  },

  async isConnected(a: string, b: string): Promise<boolean> {
    const { count } = await supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`and(requester_id.eq.${a},recipient_id.eq.${b}),and(requester_id.eq.${b},recipient_id.eq.${a})`)
      .eq('status', 'accepted');
    return (count ?? 0) > 0;
  },

  // Profile likes
  async getLiked(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('profile_likes')
      .select('liked_id')
      .eq('liker_id', userId);
    return (data ?? []).map((r: { liked_id: string }) => r.liked_id);
  },

  async toggleLike(likerId: string, likedId: string): Promise<ApiResponse<boolean>> {
    const rl = Security.checkLimit('like', likerId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const { count } = await supabase
      .from('profile_likes')
      .select('*', { count: 'exact', head: true })
      .eq('liker_id', likerId).eq('liked_id', likedId);

    if ((count ?? 0) > 0) {
      await supabase.from('profile_likes').delete().eq('liker_id', likerId).eq('liked_id', likedId);
      return { data: false, error: null };
    } else {
      const { error } = await supabase.from('profile_likes').insert({ liker_id: likerId, liked_id: likedId });
      if (error) return { data: null, error: error.message };
      return { data: true, error: null };
    }
  },
};

// ════════════════════════════════════════════════════════════════
// MESSAGES API
// ════════════════════════════════════════════════════════════════
export const messageApi = {

  async getConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as Conversation[], error: null };
  },

  async getOrCreateConversation(userId: string, peerId: string): Promise<ApiResponse<Conversation>> {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant1_id.eq.${userId},participant2_id.eq.${peerId}),and(participant1_id.eq.${peerId},participant2_id.eq.${userId})`)
      .maybeSingle();

    if (existing) return { data: existing as Conversation, error: null };

    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant1_id: userId, participant2_id: peerId })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Conversation, error: null };
  },

  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data as Message[], error: null };
  },

  async send(senderId: string, conversationId: string, body: string): Promise<ApiResponse<Message>> {
    const rl = Security.checkLimit('message', senderId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const clean = Security.sanitise(body, 2000);
    if (!clean) return { data: null, error: 'Message cannot be empty.' };

    const mod = Security.moderateContent(clean);
    if (mod.action === 'block') {
      Security.audit('MSG_BLOCKED', senderId, { reason: mod.flags[0] });
      return { data: null, error: mod.flags[0] ?? 'Message blocked.' };
    }

    const scrubbed = Security.scrubPII(clean);

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, body: scrubbed })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as Message, error: null };
  },

  async markRead(conversationId: string, userId: string): Promise<void> {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);
  },
};

// ════════════════════════════════════════════════════════════════
// JOBS API
// ════════════════════════════════════════════════════════════════
export const jobApi = {

  async getAll(filters: { state?: string; type?: string; search?: string } = {}): Promise<ApiResponse<Job[]>> {
    let query = supabase.from('jobs').select('*').eq('is_active', true);

    if (filters.state && filters.state !== 'All' && filters.state !== 'Remote') {
      query = query.eq('state', filters.state);
    }
    if (filters.type && filters.type !== 'All') {
      query = query.eq('job_type', filters.type.toLowerCase());
    }
    if (filters.search) {
      const q = Security.sanitise(filters.search, 100);
      query = query.or(`title.ilike.%${q}%,company.ilike.%${q}%`);
    }

    const { data, error } = await query.order('posted_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as Job[], error: null };
  },

  async getSaved(userId: string): Promise<ApiResponse<string[]>> {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', userId);
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r: { job_id: string }) => r.job_id), error: null };
  },

  async toggleSave(userId: string, jobId: string): Promise<ApiResponse<boolean>> {
    const { count } = await supabase
      .from('saved_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('job_id', jobId);

    if ((count ?? 0) > 0) {
      await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
      return { data: false, error: null };
    }
    const { error } = await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId });
    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  },

  async apply(userId: string, jobId: string, form: JobApplicationForm): Promise<ApiResponse<JobApplication>> {
    const rl = Security.checkLimit('jobApply', userId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    if (!Security.isValidEmail(form.email)) return { data: null, error: 'Enter a valid email address.' };

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id:     jobId,
        user_id:    userId,
        cover_text: Security.sanitise(form.intro, 1000),
        phone:      Security.sanitise(form.phone, 20),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { data: null, error: 'You have already applied to this job.' };
      return { data: null, error: error.message };
    }

    // Increment view count
    await Promise.resolve(supabase.rpc('fn_increment_job_applications', { p_job_id: jobId })).catch(() => {});

    return { data: data as JobApplication, error: null };
  },

  async hasApplied(userId: string, jobId: string): Promise<boolean> {
    const { count } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('job_id', jobId);
    return (count ?? 0) > 0;
  },
};

// ════════════════════════════════════════════════════════════════
// BLOG API
// ════════════════════════════════════════════════════════════════
export const blogApi = {

  async getPosts(category?: string): Promise<ApiResponse<BlogPost[]>> {
    let query = supabase
      .from('blog_posts')
      .select('*, author:profiles!author_id(id,name,avatar_initials,is_verified)')
      .eq('is_published', true)
      .eq('is_flagged', false);

    if (category && category !== 'All') query = query.eq('category', category);

    const { data, error } = await query.order('published_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as BlogPost[], error: null };
  },

  async getComments(postId: string): Promise<ApiResponse<BlogComment[]>> {
    const { data, error } = await supabase
      .from('blog_comments')
      .select('*, author:profiles!author_id(id,name,avatar_initials)')
      .eq('post_id', postId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data as BlogComment[], error: null };
  },

  async addComment(userId: string, postId: string, body: string): Promise<ApiResponse<BlogComment>> {
    const rl = Security.checkLimit('comment', userId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const clean = Security.sanitise(body, 1000);
    if (!clean) return { data: null, error: 'Comment cannot be empty.' };

    const mod = Security.moderateContent(clean);
    if (mod.action === 'block') return { data: null, error: mod.flags[0] ?? 'Comment blocked.' };

    const { data, error } = await supabase
      .from('blog_comments')
      .insert({ post_id: postId, author_id: userId, body: clean })
      .select('*, author:profiles!author_id(id,name,avatar_initials)')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as BlogComment, error: null };
  },

  async getLiked(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('blog_likes')
      .select('post_id')
      .eq('user_id', userId);
    return (data ?? []).map((r: { post_id: string }) => r.post_id);
  },

  async toggleLike(userId: string, postId: string): Promise<ApiResponse<boolean>> {
    const { count } = await supabase
      .from('blog_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('post_id', postId);

    if ((count ?? 0) > 0) {
      await supabase.from('blog_likes').delete().eq('user_id', userId).eq('post_id', postId);
      return { data: false, error: null };
    }
    const { error } = await supabase.from('blog_likes').insert({ user_id: userId, post_id: postId });
    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  },
};

// ════════════════════════════════════════════════════════════════
// RESOURCES API
// ════════════════════════════════════════════════════════════════
export const resourceApi = {

  async getByCategory(category: ResourceCategory): Promise<ApiResponse<Resource[]>> {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data as Resource[], error: null };
  },
};

// ════════════════════════════════════════════════════════════════
// NOTIFICATIONS API
// ════════════════════════════════════════════════════════════════
export const notificationApi = {

  async getForUser(userId: string, limit = 20): Promise<ApiResponse<Notification[]>> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error: error.message };
    return { data: data as Notification[], error: null };
  },

  async markRead(notifId: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
  },

  async markAllRead(userId: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return count ?? 0;
  },
};

// ════════════════════════════════════════════════════════════════
// SENTENCE CALCULATOR API
// ════════════════════════════════════════════════════════════════
export const calculatorApi = {

  SENTENCING_RULES: {
    TX: { min: .25, max: .5,  note: 'Texas allows 25–50% reduction with good conduct. Violent offenses typically serve 50%+.' },
    CA: { min: .33, max: .5,  note: 'California: 33–50% with good conduct and CDCR programs.' },
    FL: { min: .15, max: .85, note: 'Florida: Most serve 85% of sentence. Very limited good-time credits.' },
    NY: { min: .33, max: .5,  note: 'New York: Merit time and good behavior can reduce by up to 1/3.' },
    GA: { min: .5,  max: .9,  note: 'Georgia: 90% for violent, 50% for non-violent offenses.' },
    IL: { min: .5,  max: .5,  note: 'Illinois day-for-day: most offenders serve exactly 50%.' },
    OH: { min: .35, max: .5,  note: 'Ohio: Good-time credit varies by felony class, 35–50%.' },
    PA: { min: .33, max: .5,  note: 'Pennsylvania: Minimum must be served before parole eligibility.' },
    NC: { min: .5,  max: .85, note: 'North Carolina: Structured sentencing with presumptive ranges.' },
    MI: { min: .33, max: .5,  note: 'Michigan: Parole eligibility at minimum, good time on max date.' },
  } as Record<string, { min: number; max: number; note: string }>,

  calculate(state: string, sentenceYears: number, offenseType: string, startDate: string) {
    const rule = this.SENTENCING_RULES[state];
    if (!rule) return null;

    const totalMonths = sentenceYears * 12;
    const violent     = offenseType === 'violent';
    const minServe    = Math.round(totalMonths * (violent ? rule.max : rule.min));
    const maxServe    = Math.round(totalMonths * (violent ? 1.0 : rule.max));

    const start   = new Date(startDate);
    const minR    = new Date(start); minR.setMonth(minR.getMonth() + minServe);
    const maxR    = new Date(start); maxR.setMonth(maxR.getMonth() + maxServe);
    const today   = new Date();
    const served  = Math.max(0, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const pct     = Math.min(100, Math.round((served / totalMonths) * 100));

    return {
      minServeMonths:  minServe,
      maxServeMonths:  maxServe,
      earliestRelease: minR,
      latestRelease:   maxR,
      totalMonths,
      monthsServed:    served,
      percentServed:   pct,
      stateNote:       rule.note,
    };
  },

  async saveResult(userId: string, input: Record<string, unknown>, result: Record<string, unknown>): Promise<void> {
    await Promise.resolve(supabase.from('sentence_calculations').insert({
      user_id:          userId,
      state:            input.state,
      sentence_years:   input.sentenceYears,
      offense_type:     input.offenseType,
      start_date:       input.startDate,
      earliest_release: (result.earliestRelease as Date).toISOString().split('T')[0],
      latest_release:   (result.latestRelease as Date).toISOString().split('T')[0],
      pct_served:       result.percentServed,
    })).catch(() => {});
  },
};

// ════════════════════════════════════════════════════════════════
// REPORTS API
// ════════════════════════════════════════════════════════════════
export const reportApi = {

  async submit(
    reporterId: string,
    target: { user?: string; post?: string; message?: string },
    reason: string
  ): Promise<ApiResponse<boolean>> {
    const rl = Security.checkLimit('report', reporterId);
    if (!rl.ok) return { data: null, error: rl.message ?? 'Rate limit exceeded.' };

    const cleanReason = Security.sanitise(reason, 500);
    if (!cleanReason || cleanReason.length < 5) return { data: null, error: 'Please provide a reason.' };

    const { error } = await supabase.from('reports').insert({
      reporter_id:   reporterId,
      reported_user: target.user ?? null,
      reported_post: target.post ?? null,
      reported_msg:  target.message ?? null,
      reason:        cleanReason,
    });

    if (error) return { data: null, error: error.message };
    Security.audit('REPORTED', reporterId, { target });
    return { data: true, error: null };
  },
};
