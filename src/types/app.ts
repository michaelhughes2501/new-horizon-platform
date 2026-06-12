// src/types/app.ts
// ─────────────────────────────────────────────────────────────
// Application-level types. 
// Database types are in database.ts (auto-generated from Supabase).
// ─────────────────────────────────────────────────────────────

// ── Enums (mirror SQL enums in 001_complete_schema.sql) ───────
export type OffenseType =
  | 'non-violent'
  | 'violent'
  | 'drug'
  | 'financial'
  | 'prefer_not_to_say';

export type UserRole =
  | 'member'
  | 'moderator'
  | 'admin'
  | 'super_admin';

export type NotificationType =
  | 'match'
  | 'message'
  | 'job'
  | 'resource'
  | 'system'
  | 'security'
  | 'admin';

export type JobType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'temporary';

export type ReportStatus =
  | 'pending'
  | 'reviewing'
  | 'resolved'
  | 'dismissed';

export type ConnectionStatus =
  | 'pending'
  | 'accepted'
  | 'blocked';

export type ApplicationStatus =
  | 'submitted'
  | 'viewed'
  | 'shortlisted'
  | 'rejected'
  | 'hired';

// ── Profile ───────────────────────────────────────────────────
export interface Profile {
  id:               string;
  email:            string;
  name:             string;
  avatar_initials:  string;
  age:              number | null;
  state:            string | null;
  bio:              string | null;
  offense_type:     OffenseType;
  release_year:     number | null;
  interests:        string[];
  role:             UserRole;
  is_verified:      boolean;
  is_banned:        boolean;
  profile_complete: number;
  last_seen:        string;
  created_at:       string;
  // Security fields (never returned to client via public API)
  // login_attempts, locked_until, phone_hash, password_hash excluded
}

export interface PublicProfile extends Omit<Profile,
  'email' | 'is_banned' | 'role' | 'login_attempts'
> {
  last_seen_label: string; // fuzzy: "Online" | "Recently active" etc.
}

// ── Auth ──────────────────────────────────────────────────────
export interface AuthUser {
  id:    string;
  email: string;
}

export interface SessionData {
  user:         Profile;
  access_token: string;
}

// ── Connection ────────────────────────────────────────────────
export interface Connection {
  id:           string;
  requester_id: string;
  recipient_id: string;
  status:       ConnectionStatus;
  created_at:   string;
  peer?:        PublicProfile; // populated via JOIN
}

// ── Conversation & Message ────────────────────────────────────
export interface Conversation {
  id:               string;
  participant1_id:  string;
  participant2_id:  string;
  last_message:     string | null;
  last_message_at:  string | null;
  unread_count_p1:  number;
  unread_count_p2:  number;
  created_at:       string;
  peer?:            PublicProfile; // the other participant
}

export interface Message {
  id:              string;
  conversation_id: string;
  sender_id:       string;
  body:            string;
  is_read:         boolean;
  is_deleted:      boolean;
  created_at:      string;
}

// ── Job ───────────────────────────────────────────────────────
export interface Job {
  id:                  string;
  title:               string;
  company:             string;
  logo_emoji:          string;
  location:            string;
  state:               string | null;
  job_type:            JobType;
  wage_display:        string | null;
  description:         string | null;
  tags:                string[];
  felony_friendly:     boolean;
  ban_the_box:         boolean;
  apply_url:           string | null;
  is_active:           boolean;
  views_count:         number;
  applications_count:  number;
  posted_at:           string;
  expires_at:          string;
}

export interface JobApplication {
  id:          string;
  job_id:      string;
  user_id:     string;
  cover_text:  string | null;
  phone:       string | null;
  status:      ApplicationStatus;
  created_at:  string;
}

// ── Blog ──────────────────────────────────────────────────────
export interface BlogPost {
  id:             string;
  author_id:      string;
  title:          string;
  slug:           string;
  body:           string;
  excerpt:        string | null;
  category:       string;
  emoji_icon:     string;
  read_time:      number;
  likes_count:    number;
  views_count:    number;
  comments_count: number;
  is_published:   boolean;
  is_featured:    boolean;
  published_at:   string | null;
  created_at:     string;
  author?:        PublicProfile; // populated via JOIN
}

export interface BlogComment {
  id:         string;
  post_id:    string;
  author_id:  string;
  body:       string;
  is_flagged: boolean;
  created_at: string;
  author?:    PublicProfile; // populated via JOIN
}

// ── Resource ──────────────────────────────────────────────────
export type ResourceCategory =
  | 'parole'
  | 'mental'
  | 'housing'
  | 'education'
  | 'employment'
  | 'legal';

export interface Resource {
  id:          string;
  name:        string;
  category:    ResourceCategory;
  description: string | null;
  url:         string | null;
  phone:       string | null;
  state:       string | null;
  is_urgent:   boolean;
  icon_emoji:  string;
  badge_label: string | null;
  sort_order:  number;
}

// ── Notification ─────────────────────────────────────────────
export interface Notification {
  id:         string;
  user_id:    string;
  type:       NotificationType;
  title:      string;
  body:       string;
  data:       Record<string, unknown>;
  is_read:    boolean;
  created_at: string;
}

// ── Sentence Calculator ───────────────────────────────────────
export interface SentencingRule {
  state:        string;
  min_ratio:    number;
  max_ratio:    number;
  note:         string;
}

export interface CalculatorInput {
  state:        string;
  sentenceYears: number;
  offenseType:  OffenseType;
  startDate:    string;
}

export interface CalculatorResult {
  minServeMonths:  number;
  maxServeMonths:  number;
  earliestRelease: Date;
  latestRelease:   Date;
  totalMonths:     number;
  monthsServed:    number;
  percentServed:   number;
  stateNote:       string;
}

// ── Report ────────────────────────────────────────────────────
export interface Report {
  id:            string;
  reporter_id:   string;
  reported_user: string | null;
  reported_post: string | null;
  reported_msg:  string | null;
  reason:        string;
  status:        ReportStatus;
  created_at:    string;
}

// ── API Response wrapper ──────────────────────────────────────
export interface ApiResponse<T> {
  data:  T | null;
  error: string | null;
}

// ── UI State ──────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warn';

export interface ToastMessage {
  id:      string;
  msg:     string;
  type:    ToastType;
}

export interface FilterState {
  state:  string;
  type:   string;
  search: string;
}

// ── Form types ────────────────────────────────────────────────
export interface ProfileFormData {
  name:        string;
  age:         string;
  state:       string;
  bio:         string;
  offense:     string;
  interests:   string;
  phone:       string;
}

export interface JobApplicationForm {
  name:        string;
  email:       string;
  phone:       string;
  intro:       string;
}

export interface LoginForm {
  email:    string;
  password: string;
}

export interface RegisterForm extends LoginForm {
  name:     string;
  confirm:  string;
}
