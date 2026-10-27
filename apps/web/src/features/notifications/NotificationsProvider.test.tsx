import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { NotificationsProvider } from './NotificationsProvider';
import { useNotifications } from '../../hooks/useNotifications';

const Trigger: React.FC = () => {
  const notify = useNotifications();
  return (
    <>
      <button onClick={() => notify.success('Saved')}>ok</button>
      <button onClick={() => notify.error('Boom')}>fail</button>
      <button onClick={() => notify.notify('info', 'Saving', { key: 'slot' })}>keyed-saving</button>
      <button onClick={() => notify.notify('success', 'Saved', { key: 'slot' })}>keyed-saved</button>
    </>
  );
};

const setup = () =>
  render(
    <NotificationsProvider>
      <Trigger />
    </NotificationsProvider>,
  );

describe('NotificationsProvider', () => {
  afterEach(() => vi.useRealTimers());

  it('shows a success toast and auto-dismisses it after 5s', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.click(screen.getByText('ok'));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('keeps an error toast until the user dismisses it', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.click(screen.getByText('fail'));
    expect(screen.getByText('Boom')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('Boom')).toBeInTheDocument(); // no auto-hide for errors
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Boom')).not.toBeInTheDocument();
  });

  it('stacks multiple notifications', () => {
    setup();
    fireEvent.click(screen.getByText('ok'));
    fireEvent.click(screen.getByText('fail'));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('keeps one slot for a keyed notification instead of stacking', () => {
    setup();
    fireEvent.click(screen.getByText('keyed-saving'));
    fireEvent.click(screen.getByText('keyed-saved'));
    fireEvent.click(screen.getByText('keyed-saving'));
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Saving'); // rewritten in place, last one wins
  });

  it('re-arms the auto-hide of a keyed notification on every update', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.click(screen.getByText('keyed-saving'));
    act(() => { vi.advanceTimersByTime(4000); });
    fireEvent.click(screen.getByText('keyed-saved'));
    act(() => { vi.advanceTimersByTime(4000); }); // past the FIRST toast's 5s, not the update's
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('posts a fresh toast once a keyed notification was dismissed', () => {
    setup();
    fireEvent.click(screen.getByText('keyed-saving'));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('keyed-saved'));
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('throws when used outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/NotificationsProvider/);
    spy.mockRestore();
  });
});
