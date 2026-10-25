// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@apptypes/app';
import { AuthProvider, useAuth } from './AuthContext';

const api = vi.hoisted(() => ({
  authApi: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  profileApi: { getById: vi.fn(), updateLastSeen: vi.fn() },
}));

vi.mock('@lib/api', () => api);
vi.mock('@lib/security', () => ({ default: { clearSession: vi.fn() } }));

const profile: Profile = {
  id: 'member-1',
  email: 'member@example.test',
  name: 'Test Member',
  avatar_initials: 'TM',
  age: null,
  state: null,
  bio: null,
  offense_type: 'prefer_not_to_say',
  release_year: null,
  interests: [],
  role: 'member',
  is_verified: false,
  is_banned: false,
  profile_complete: 0,
  last_seen: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
};

describe('AuthProvider user-dependent callbacks and heartbeat', () => {
  let root: Root;
  let container: HTMLDivElement;
  let auth: ReturnType<typeof useAuth>;

  function Consumer() {
    auth = useAuth();
    return <span>{auth.loading ? 'Loading' : auth.user?.name ?? 'Signed out'}</span>;
  }

  async function mount() {
    await act(async () => {
      root.render(<AuthProvider><Consumer /></AuthProvider>);
    });
  }

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    api.authApi.getSession.mockResolvedValue({ data: profile, error: null });
    api.authApi.signOut.mockResolvedValue(undefined);
    api.profileApi.updateLastSeen.mockResolvedValue({ data: null, error: null });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits for session restoration before starting a heartbeat', async () => {
    let restore!: (result: { data: Profile; error: null }) => void;
    api.authApi.getSession.mockReturnValue(new Promise((resolve) => { restore = resolve; }));
    await mount();

    expect(container.textContent).toBe('Loading');
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });
    expect(api.profileApi.updateLastSeen).not.toHaveBeenCalled();

    await act(async () => { restore({ data: profile, error: null }); });
    expect(auth.user).toEqual(profile);
    expect(container.textContent).toBe(profile.name);
    expect(api.authApi.getSession).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000 - 1); });
    expect(api.profileApi.updateLastSeen).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.profileApi.updateLastSeen).toHaveBeenCalledExactlyOnceWith(profile.id);
  });

  it('does not fetch a profile or send heartbeats when signed out', async () => {
    api.authApi.getSession.mockResolvedValue({ data: null, error: null });
    await mount();
    await act(async () => { await auth.refreshUser(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });

    expect(auth.loading).toBe(false);
    expect(auth.user).toBeNull();
    expect(api.profileApi.getById).not.toHaveBeenCalled();
    expect(api.profileApi.updateLastSeen).not.toHaveBeenCalled();
  });

  it('refreshes a profile with the same id and restarts exactly one heartbeat', async () => {
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    const updated = { ...profile, name: 'Updated Member' };
    api.profileApi.getById.mockResolvedValue({ data: updated, error: null });
    await act(async () => { await auth.refreshUser(); });

    expect(api.profileApi.getById).toHaveBeenCalledExactlyOnceWith(profile.id);
    expect(auth.user).toEqual(updated);
    expect(container.textContent).toBe('Updated Member');

    // The old [user?.id] dependency would fire the original timer at this point.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(api.profileApi.updateLastSeen).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    expect(api.profileApi.updateLastSeen).toHaveBeenCalledExactlyOnceWith(profile.id);
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });
    expect(api.profileApi.updateLastSeen).toHaveBeenCalledTimes(2);
  });

  it('uses the current account for refreshes and heartbeats after an account change', async () => {
    await mount();
    const nextProfile = { ...profile, id: 'member-2', name: 'Second Member' };
    api.authApi.signIn.mockResolvedValue({ data: nextProfile, error: null });
    await act(async () => { await auth.signIn('second@example.test', 'test-password'); });
    api.profileApi.getById.mockResolvedValue({ data: nextProfile, error: null });
    await act(async () => { await auth.refreshUser(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });

    expect(api.profileApi.getById).toHaveBeenCalledExactlyOnceWith(nextProfile.id);
    expect(api.profileApi.updateLastSeen).toHaveBeenCalledExactlyOnceWith(nextProfile.id);
  });

  it('keeps the current profile and heartbeat when a refresh returns no data', async () => {
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    api.profileApi.getById.mockResolvedValue({ data: null, error: 'Profile unavailable' });
    await act(async () => { await auth.refreshUser(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(auth.user).toEqual(profile);
    expect(api.profileApi.updateLastSeen).toHaveBeenCalledExactlyOnceWith(profile.id);
  });

  it('continues heartbeats after a rejected last-seen update', async () => {
    api.profileApi.updateLastSeen.mockRejectedValueOnce(new Error('Offline'));
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });

    expect(api.profileApi.updateLastSeen).toHaveBeenCalledTimes(2);
    expect(auth.user).toEqual(profile);
  });

  it('stops the heartbeat and makes refresh a no-op after signing out', async () => {
    await mount();
    await act(async () => { await auth.signOut(); });
    await act(async () => { await auth.refreshUser(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });

    expect(container.textContent).toBe('Signed out');
    expect(api.profileApi.updateLastSeen).not.toHaveBeenCalled();
    expect(api.profileApi.getById).not.toHaveBeenCalled();
  });

  it('cleans up the active heartbeat when the provider is removed', async () => {
    await mount();
    await act(async () => { root.render(null); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });

    expect(api.profileApi.updateLastSeen).not.toHaveBeenCalled();
  });
});
