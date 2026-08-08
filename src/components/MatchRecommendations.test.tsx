// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MatchRecommendations } from './MatchRecommendations';

// This PR moves `fetchRecommendations` above the `useEffect` that calls it on
// mount (previously the effect came first). These tests confirm the
// fetch-on-mount / like / skip flow behaves identically after that reorder.

const matches = [
  {
    id: 1,
    username: 'alice',
    age: 28,
    location: 'Austin',
    bio: 'Loves hiking',
    match_score: 92,
  },
  {
    id: 2,
    username: 'bea',
    age: 31,
    location: 'Denver',
    bio: 'Coffee enthusiast',
    match_score: 55,
  },
];

function mockFetch(list: unknown[] = matches) {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/dashboard/ai/recommend-matches') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(list) });
    }
    if (url.startsWith('/like/') && init?.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });
}

describe('MatchRecommendations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a loading state before recommendations arrive', () => {
    render(<MatchRecommendations />);
    expect(screen.getByText(/finding your perfect matches/i)).toBeTruthy();
  });

  it('fetches recommendations exactly once on mount', async () => {
    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.queryByText(/finding your perfect matches/i)).toBeNull();
    });

    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call) => call[0] === '/api/dashboard/ai/recommend-matches'
    );
    expect(calls).toHaveLength(1);
  });

  it('renders the first match once loaded', async () => {
    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    expect(screen.getByText('Match 1 of 2')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
  });

  it('shows the empty state when there are no recommendations', async () => {
    vi.stubGlobal('fetch', mockFetch([]));

    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.getByText(/seen all recommendations/i)).toBeTruthy();
    });
  });

  it('advances to the next match when Skip is clicked', async () => {
    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByText('bea')).toBeTruthy();
    });
    expect(screen.getByText('Match 2 of 2')).toBeTruthy();
  });

  it('posts a like and advances to the next match when Like is clicked', async () => {
    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /like/i }));

    await waitFor(() => {
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some((call) => call[0] === '/like/1')).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText('bea')).toBeTruthy();
    });
  });

  it('resets to the empty state after skipping past the last match', async () => {
    vi.stubGlobal('fetch', mockFetch([matches[0]]));

    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByText(/seen all recommendations/i)).toBeTruthy();
    });
  });

  it('re-fetches recommendations when "Refresh Matches" is clicked', async () => {
    vi.stubGlobal('fetch', mockFetch([]));

    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.getByText(/seen all recommendations/i)).toBeTruthy();
    });

    // The empty state doesn't render the refresh button (it's only shown
    // alongside a current match), so re-render with matches to exercise it.
    cleanup();
    vi.stubGlobal('fetch', mockFetch());

    render(<MatchRecommendations />);
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /refresh matches/i }));

    await waitFor(() => {
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === '/api/dashboard/ai/recommend-matches'
      );
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('logs an error and stops loading when the fetch fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );

    render(<MatchRecommendations />);

    await waitFor(() => {
      expect(screen.queryByText(/finding your perfect matches/i)).toBeNull();
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching matches:',
      expect.any(Error)
    );
    expect(screen.getByText(/seen all recommendations/i)).toBeTruthy();
  });
});