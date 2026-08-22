// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, within, fireEvent } from '@testing-library/react';
import { AdminDashboard } from './AdminDashboard';

// This PR reorders `fetchStats`/`fetchUsers` to be declared *before* the
// `useEffect` that calls them (previously the effect was declared first,
// referencing functions hoisted later in the file — a pattern the
// `react-hooks/exhaustive-deps` rule flags once the disabled compiler rules
// are gone). These tests confirm the data-fetching-on-mount behavior is
// unchanged by that reordering.

const statsResponse = {
  total_users: 120,
  total_messages: 340,
  total_posts: 12,
  total_matches: 45,
  active_users_week: 30,
  new_users_week: 5,
  messages_week: 80,
  engagement_rate: 42.5,
};

const usersResponse = {
  users: [
    {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-02-01T00:00:00Z',
      matches: 3,
    },
    {
      id: 2,
      username: 'bob',
      email: 'bob@example.com',
      created_at: '2024-01-05T00:00:00Z',
      matches: 0,
    },
  ],
};

function mockFetchImplementation(overrides: Partial<{ stats: unknown; users: unknown }> = {}) {
  const stats = overrides.stats ?? statsResponse;
  const users = overrides.users ?? usersResponse;

  return vi.fn((url: string) => {
    if (url.includes('/api/dashboard/stats')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(stats),
      });
    }
    if (url.includes('/api/dashboard/users')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(users),
      });
    }
    if (url.includes('/api/dashboard/activity-log')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchImplementation());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a loading indicator before data has loaded', () => {
    render(<AdminDashboard />);
    expect(screen.getByText(/loading dashboard/i)).toBeTruthy();
  });

  it('fetches stats and users on mount exactly once each', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/loading dashboard/i)).toBeNull();
    });

    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0]
    );
    const statsCalls = calls.filter((url: string) => url.includes('/api/dashboard/stats'));
    const usersCalls = calls.filter((url: string) => url.includes('/api/dashboard/users'));

    expect(statsCalls).toHaveLength(1);
    expect(usersCalls).toHaveLength(1);
  });

  it('renders overview stats once stats have loaded', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('120')).toBeTruthy();
    });

    expect(screen.getByText('+5 this week')).toBeTruthy();
    expect(screen.getByText('340')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
  });

  it('switches to the Users tab and renders fetched users in a table', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/loading dashboard/i)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('alice')).toBeTruthy();
    expect(within(table).getByText('alice@example.com')).toBeTruthy();
    expect(within(table).getByText('bob')).toBeTruthy();
    // A user without last_login should display "Never".
    expect(within(table).getByText('Never')).toBeTruthy();
  });

  it('stops loading and logs an error when fetchStats rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/loading dashboard/i)).toBeNull();
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching stats:',
      expect.any(Error)
    );
  });

  it('does not render the overview stat grid when stats fail to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/loading dashboard/i)).toBeNull();
    });

    expect(screen.queryByText('Total Users')).toBeNull();
  });
});