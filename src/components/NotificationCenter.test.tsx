// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from './NotificationCenter';

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.OPEN;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  close = vi.fn(() => { this.readyState = 3; });

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  receive(title: string) {
    this.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify({ type: 'message', title, description: `Body: ${title}` }),
    }));
  }
}

describe('NotificationCenter callback lifecycle', () => {
  let root: Root;
  let container: HTMLDivElement;

  async function render(props: Parameters<typeof NotificationCenter>[0] = {}) {
    await act(async () => { root.render(<NotificationCenter {...props} />); });
  }

  async function receive(title: string) {
    // Production ids use Date.now(); represent messages arriving at distinct times.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      FakeWebSocket.instances[FakeWebSocket.instances.length - 1].receive(title);
    });
  }

  function titles() {
    return Array.from(container.querySelectorAll('h4'), (node) => node.textContent);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('WebSocket', FakeWebSocket);
    FakeWebSocket.instances = [];
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

  it('receives notifications without recreating the WebSocket on state updates', async () => {
    await render();
    await receive('First message');
    await receive('Second message');

    expect(titles()).toEqual(['Second message', 'First message']);
    expect(container.textContent).toContain('Body: First message');
    expect(container.textContent).toContain('New notifications');
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].close).not.toHaveBeenCalled();
  });

  it('removes only the expired notification at the exact auto-close boundary', async () => {
    await render();
    await receive('Older message');
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    await receive('Newer message');

    await act(async () => { await vi.advanceTimersByTimeAsync(3_999); });
    expect(titles()).toEqual(['Newer message', 'Older message']);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(titles()).toEqual(['Newer message']);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(titles()).toEqual([]);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('keeps notifications when auto-close is disabled', async () => {
    await render({ autoClose: 0 });
    await receive('Persistent message');
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(titles()).toEqual(['Persistent message']);
  });

  it('dismisses one notification without removing the others', async () => {
    await render({ autoClose: 0 });
    await receive('First message');
    await receive('Second message');
    await act(async () => {
      container.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(titles()).toEqual(['First message']);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('limits the list to the newest notifications', async () => {
    await render({ autoClose: 0, maxNotifications: 2 });
    await receive('First message');
    await receive('Second message');
    await receive('Third message');

    expect(titles()).toEqual(['Third message', 'Second message']);
  });

  it('uses updated auto-close and limit props for subsequent messages', async () => {
    await render({ autoClose: 0, maxNotifications: 3 });
    await receive('Existing message');
    const oldSocket = FakeWebSocket.instances[0];
    await render({ autoClose: 100, maxNotifications: 1 });
    expect(oldSocket.close).toHaveBeenCalledTimes(1);

    await receive('New message');
    expect(titles()).toEqual(['New message']);
    await act(async () => { await vi.advanceTimersByTimeAsync(99); });
    expect(titles()).toEqual(['New message']);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(titles()).toEqual([]);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not resubscribe for unchanged props and closes the socket on removal', async () => {
    await render({ autoClose: 0, maxNotifications: 2 });
    await render({ autoClose: 0, maxNotifications: 2 });
    expect(FakeWebSocket.instances).toHaveLength(1);
    await act(async () => { root.render(null); });

    expect(FakeWebSocket.instances[0].close).toHaveBeenCalledTimes(1);
  });
});
