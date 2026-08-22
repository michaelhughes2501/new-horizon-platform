// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { ResourceFinder } from './ResourceFinder';

// This PR moves `fetchResources`/`applyFilters` above the two `useEffect`
// hooks that call them (previously the effects were declared first). These
// tests confirm fetch-on-mount, filtering, and AI recommendation behavior are
// unchanged by that reorder.

const resources = [
  {
    category: 'Housing',
    name: 'Shelter A',
    description: 'Emergency housing assistance',
    url: 'https://shelter-a.example.com',
    tags: ['housing', 'emergency'],
  },
  {
    category: 'Legal',
    name: 'Legal Aid B',
    description: 'Free legal consultation',
    url: 'https://legal-b.example.com',
    tags: ['legal', 'free'],
  },
];

function mockFetch(list: unknown[] = resources, reply = 'Try Shelter A for immediate housing.') {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/resources') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(list) });
    }
    if (url === '/api/chat' && init?.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ reply }) });
    }
    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
  });
}

describe('ResourceFinder', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a loading state before resources have loaded', () => {
    render(<ResourceFinder />);
    expect(screen.getByText(/loading resources/i)).toBeTruthy();
  });

  it('fetches resources on mount and renders all of them once loaded', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    expect(screen.getByText('Legal Aid B')).toBeTruthy();
    expect(screen.getByText('Found 2 resources')).toBeTruthy();
  });

  it('derives the category and tag filter lists from the fetched resources', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Housing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Legal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'housing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'emergency' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'legal' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'free' })).toBeTruthy();
  });

  it('filters resources by category', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Housing' }));

    await waitFor(() => {
      expect(screen.queryByText('Legal Aid B')).toBeNull();
    });
    expect(screen.getByText('Shelter A')).toBeTruthy();
    expect(screen.getByText('Found 1 resource')).toBeTruthy();
  });

  it('filters resources by tag, and can toggle the tag filter back off', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'legal' }));

    await waitFor(() => {
      expect(screen.queryByText('Shelter A')).toBeNull();
    });
    expect(screen.getByText('Legal Aid B')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'legal' }));

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });
  });

  it('filters resources by search query across name, description and tags', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText(/search for housing/i), {
      target: { value: 'legal consultation' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Shelter A')).toBeNull();
    });
    expect(screen.getByText('Legal Aid B')).toBeTruthy();
  });

  it('requests and displays an AI recommendation once a search query is entered', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText(/search for housing/i), {
      target: { value: 'housing' },
    });

    await waitFor(() => {
      expect(screen.getByText('Try Shelter A for immediate housing.')).toBeTruthy();
    });

    const chatCalls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call) => call[0] === '/api/chat'
    );
    expect(chatCalls).toHaveLength(1);
    const body = JSON.parse(chatCalls[0][1].body);
    expect(body.message).toContain('housing');
    expect(body.context).toBe('resources');
  });

  it('shows the "no resources found" message when filters exclude everything', async () => {
    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.getByText('Shelter A')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText(/search for housing/i), {
      target: { value: 'nonexistent-resource-xyz' },
    });

    await waitFor(() => {
      expect(screen.getByText(/no resources found/i)).toBeTruthy();
    });
    expect(screen.getByText('Found 0 resources')).toBeTruthy();
  });

  it('stops loading and logs an error when fetchResources fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );

    render(<ResourceFinder />);

    await waitFor(() => {
      expect(screen.queryByText(/loading resources/i)).toBeNull();
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching resources:',
      expect.any(Error)
    );
    expect(screen.getByText('Found 0 resources')).toBeTruthy();
  });
});