// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

const stats = {
  total_users: 20,
  total_messages: 100,
  total_posts: 8,
  total_matches: 5,
  active_users_week: 12,
  new_users_week: 3,
  messages_week: 25,
  engagement_rate: 60,
};
const users = [{
  id: 1,
  username: 'Test Member',
  email: 'member@example.test',
  created_at: '2026-01-01T00:00:00Z',
  matches: 2,
}];
const activity = [
  { type: 'message', user: 'Alex', action: 'Sent a message', timestamp: '2026-01-02T10:00:00Z' },
  { type: 'post', user: 'Taylor', action: 'Published a post', timestamp: '2026-01-02T11:00:00Z' },
  { type: 'match', user: 'Jordan', action: 'Made a connection', timestamp: '2026-01-02T12:00:00Z' },
];

describe('AdminDashboard typed tabs and activity feed', () => {
  let root: Root;
  let container: HTMLDivElement;
  let activities: typeof activity;
  let activityError: Error | null;
  const fetchMock = vi.fn<typeof fetch>();

  async function mount() {
    await act(async () => { root.render(<AdminDashboard />); });
  }

  async function selectTab(label: string) {
    const button = Array.from(container.querySelectorAll('button'))
      .find((node) => node.textContent === label);
    expect(button, `Tab ${label} should exist`).toBeDefined();
    await act(async () => { button!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(button!.classList.contains('border-b-2')).toBe(true);
    expect(container.querySelectorAll('button.border-b-2')).toHaveLength(1);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    activities = activity;
    activityError = null;
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url) => {
      let data: unknown;
      switch (url) {
        case '/api/dashboard/stats': data = stats; break;
        case '/api/dashboard/users?page=1&per_page=10': data = { users }; break;
        case '/api/dashboard/activity-log?limit=20':
          if (activityError) throw activityError;
          data = activities;
          break;
        default: throw new Error(`Unexpected URL: ${url}`);
      }
      return { json: async () => data } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
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
    vi.restoreAllMocks();
  });

  it('switches between all typed tabs and restores the overview', async () => {
    await mount();
    expect(container.textContent).toContain('Total Users');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/dashboard/activity-log?limit=20');

    await selectTab('Users');
    expect(container.querySelector('tbody')?.textContent).toContain('Test Member');
    expect(container.textContent).toContain('member@example.test');
    expect(container.textContent).not.toContain('Total Users');

    await selectTab('Activity');
    expect(container.textContent).toContain('Sent a message');
    expect(container.querySelector('table')).toBeNull();

    await selectTab('Overview');
    expect(container.textContent).toContain('Total Users');
    expect(container.textContent).not.toContain('Sent a message');
  });

  it('renders typed activity fields and supports additional string activity types', async () => {
    await mount();
    await selectTab('Activity');

    for (const entry of activity) {
      expect(container.textContent).toContain(entry.user);
      expect(container.textContent).toContain(entry.action);
      expect(container.textContent).toContain(new Date(entry.timestamp).toLocaleString());
    }
    expect(container.querySelectorAll('.bg-blue-500')).toHaveLength(1);
    expect(container.querySelectorAll('.bg-green-500')).toHaveLength(1);
    expect(container.querySelectorAll('.bg-purple-500')).toHaveLength(1);
  });

  it('renders an empty activity response without inventing rows', async () => {
    activities = [];
    await mount();
    await selectTab('Activity');

    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard/activity-log?limit=20');
    expect(container.querySelectorAll('.shadow.p-4')).toHaveLength(0);
    expect(container.textContent).not.toContain('undefined');
  });

  it('treats activity user and action fields as text', async () => {
    activities = [{
      type: 'system',
      user: '<script>unexpected()</script>',
      action: '<img src=x onerror=unexpected()>',
      timestamp: activity[0].timestamp,
    }];
    await mount();
    await selectTab('Activity');

    expect(container.textContent).toContain(activities[0].user);
    expect(container.textContent).toContain(activities[0].action);
    expect(container.querySelector('script, img')).toBeNull();
  });

  it('replaces activity data at the polling boundary and stops polling off the tab', async () => {
    await mount();
    await selectTab('Activity');
    activities = [{ ...activity[0], action: 'New activity after refresh' }];
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
    expect(container.textContent).not.toContain('New activity after refresh');
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(container.textContent).toContain('New activity after refresh');
    expect(container.textContent).not.toContain('Published a post');

    await selectTab('Users');
    const requestCount = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchMock).toHaveBeenCalledTimes(requestCount);
  });

  it('retains the activity list after a failed refresh and recovers on the next poll', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount();
    await selectTab('Activity');
    activityError = new Error('Network unavailable');
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

    expect(container.textContent).toContain('Sent a message');
    expect(consoleError).toHaveBeenCalledWith('Error fetching activity:', activityError);
    activityError = null;
    activities = [{ ...activity[0], action: 'Connection restored' }];
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(container.textContent).toContain('Connection restored');
  });

  it('cleans up activity polling when the dashboard is removed', async () => {
    await mount();
    await selectTab('Activity');
    const requestCount = fetchMock.mock.calls.length;
    await act(async () => { root.render(null); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(fetchMock).toHaveBeenCalledTimes(requestCount);
  });
});
