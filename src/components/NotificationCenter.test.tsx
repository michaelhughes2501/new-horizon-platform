// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { NotificationCenter } from './NotificationCenter';

// This PR moves `removeNotification` above `addNotification` and adds it to
// `addNotification`'s useCallback dependency array (previously it was
// declared after `addNotification` used it, which the exhaustive-deps rule
// flags). These tests verify that the add -> auto-close -> remove wiring,
// the max-notifications cap, and manual close/read actions all still behave
// correctly after that reorder.

class FakeWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState: number;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    this.readyState = FakeWebSocket.OPEN;
    FakeWebSocket.instances.push(this);
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

function latestSocket() {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing and shows no badge when there are no notifications', () => {
    render(<NotificationCenter />);
    expect(screen.queryByText(/new notifications/i)).toBeNull();
  });

  it('opens a WebSocket connection to the notifications endpoint on mount', () => {
    render(<NotificationCenter />);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(latestSocket().url).toContain('/ws/notifications');
  });

  it('adds a notification and increments the unread badge when a message arrives', () => {
    render(<NotificationCenter />);

    act(() => {
      latestSocket().emitMessage({
        type: 'message',
        title: 'New message',
        description: 'You have a new message from Alice',
      });
    });

    expect(screen.getByText('New message')).toBeTruthy();
    expect(screen.getByText('You have a new message from Alice')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText(/new notifications/i)).toBeTruthy();
  });

  it('caps the number of visible notifications at maxNotifications, keeping the newest first', () => {
    render(<NotificationCenter maxNotifications={2} />);

    act(() => {
      latestSocket().emitMessage({ type: 'system', title: 'First', description: 'd1' });
    });
    act(() => {
      latestSocket().emitMessage({ type: 'system', title: 'Second', description: 'd2' });
    });
    act(() => {
      latestSocket().emitMessage({ type: 'system', title: 'Third', description: 'd3' });
    });

    expect(screen.queryByText('First')).toBeNull();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByText('Third')).toBeTruthy();
    // unreadCount tracks every notification ever added, not just visible ones.
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('removes a notification when its close button is clicked', () => {
    render(<NotificationCenter />);

    act(() => {
      latestSocket().emitMessage({ type: 'like', title: 'Liked', description: 'Someone liked you' });
    });

    expect(screen.getByText('Liked')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    expect(screen.queryByText('Liked')).toBeNull();
  });

  it('marks a notification as read (and decrements unread count) when clicked', () => {
    render(<NotificationCenter />);

    act(() => {
      latestSocket().emitMessage({ type: 'comment', title: 'New comment', description: 'Nice post!' });
    });

    expect(screen.getByText('1')).toBeTruthy();

    fireEvent.click(screen.getByText('New comment'));

    // Notification stays, but the unread badge disappears since the count hits 0.
    expect(screen.getByText('New comment')).toBeTruthy();
    expect(screen.queryByText(/new notifications/i)).toBeNull();
  });

  it('auto-closes a notification after the autoClose delay elapses', () => {
    vi.useFakeTimers();
    render(<NotificationCenter autoClose={5000} />);

    act(() => {
      latestSocket().emitMessage({ type: 'match', title: 'New match', description: 'You matched!' });
    });
    expect(screen.getByText('New match')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('New match')).toBeNull();
  });

  it('does not schedule removal when autoClose is 0', () => {
    vi.useFakeTimers();
    render(<NotificationCenter autoClose={0} />);

    act(() => {
      latestSocket().emitMessage({ type: 'match', title: 'Persistent', description: 'Stays visible' });
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText('Persistent')).toBeTruthy();
  });

  it('closes the open WebSocket connection on unmount', () => {
    const { unmount } = render(<NotificationCenter />);
    const socket = latestSocket();
    expect(socket.readyState).toBe(FakeWebSocket.OPEN);

    unmount();

    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to close an already-closed WebSocket on unmount', () => {
    const { unmount } = render(<NotificationCenter />);
    const socket = latestSocket();
    socket.readyState = FakeWebSocket.CLOSED;

    unmount();

    expect(socket.close).not.toHaveBeenCalled();
  });
});