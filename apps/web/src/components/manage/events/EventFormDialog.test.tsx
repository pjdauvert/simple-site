import { describe, it, expect, vi } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { EventFormDialog } from './EventFormDialog';
import type { EventDraft } from './eventsDraft';

vi.mock('../../../services/mediaService', () => ({ listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }) }));

/**
 * The suite runs on `TZ=Europe/Paris` (see `vitest.config.ts`): a June instant
 * is UTC+2 locally, so every expectation below would fail if the dialog read or
 * wrote its dates in UTC instead of the admin's own timezone. The `en` UI
 * locale drives the picker format (`MM/DD/YYYY`, 12-hour clock).
 */
const event = (over: Partial<EventDraft> = {}): EventDraft => ({
  slug: 'summer-festival',
  name: 'Summer Festival',
  startDateTime: '2027-06-18T17:30:00.000Z', // 19:30 in Paris
  endDateTime: '2027-06-18T21:00:00.000Z', // 23:00 in Paris
  location: 'Place de la Bourse',
  persisted: true,
  ...over,
});

type Props = React.ComponentProps<typeof EventFormDialog>;

const open = (draft: EventDraft, props: Partial<Props> = {}) =>
  renderWithProviders(
    <EventFormDialog
      open
      event={draft}
      errors={{}}
      showErrors={false}
      enablePicker={false}
      onChange={vi.fn()}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />,
    { theme: true },
  );

/** A picker field, whose accessible shape is a labelled group of spinbuttons. */
const field = (label: string): HTMLElement => screen.getByRole('group', { name: label });

/**
 * Types into one section of a picker field. The v8 accessible field is a group
 * of contenteditable spinbuttons (no plain `<input>`): a section takes input
 * once it has been clicked into, and the edit lands on the next `input` event.
 */
const typeSection = (fieldLabel: string, section: string, value: string): void => {
  const target = within(field(fieldLabel)).getByRole('spinbutton', { name: section });
  act(() => {
    fireEvent.mouseDown(target);
    fireEvent.mouseUp(target);
    target.focus();
  });
  act(() => {
    fireEvent.input(target, { target: { textContent: value } });
  });
};

describe('EventFormDialog date and time pickers', () => {
  it('shows the stored instants as local dates and times, without a timezone in sight', () => {
    open(event());
    expect(field('Start date')).toHaveTextContent('06/18/2027');
    expect(field('Start time')).toHaveTextContent('07:30 PM');
    expect(field('End date')).toHaveTextContent('06/18/2027');
    expect(field('End time')).toHaveTextContent('11:00 PM');
    expect(screen.queryByText(/timezone/i)).toBeNull();
    expect(screen.queryByText(/UTC/)).toBeNull();
  });

  it('formats the fields in the UI language', () => {
    renderWithProviders(
      <EventFormDialog
        open
        event={event()}
        errors={{}}
        showErrors={false}
        enablePicker={false}
        onChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
      { theme: true, locale: 'fr' },
    );
    // French: day first, 24-hour clock — straight from the UI locale.
    expect(field('Date de début')).toHaveTextContent('18/06/2027');
    expect(field('Heure de début')).toHaveTextContent('19:30');
  });

  it('hides the times of an event spanning several local days', () => {
    open(event({ endDateTime: '2027-06-20T21:59:00.000Z' }));
    expect(field('Start date')).toHaveTextContent('06/18/2027');
    expect(field('End date')).toHaveTextContent('06/20/2027');
    expect(screen.queryByRole('group', { name: 'Start time' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'End time' })).toBeNull();
  });

  it('writes a date edited in the admin timezone back as a UTC instant', () => {
    const onChange = vi.fn();
    open(event(), { onChange });

    typeSection('Start date', 'Day', '25');

    // 25 June, still 19:30 local — two hours behind in UTC.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startDateTime: '2027-06-25T17:30:00.000Z' }));
  });

  it('writes a time edited in the admin timezone back as a UTC instant', () => {
    const onChange = vi.fn();
    open(event(), { onChange });

    typeSection('Start time', 'Hours', '08');

    // 08:30 PM in Paris on 18 June is 18:30 UTC.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startDateTime: '2027-06-18T18:30:00.000Z' }));
  });

  it('flags the start date and the end time when the fields are invalid', () => {
    open(event({ startDateTime: '', endDateTime: '2027-06-18T15:00:00.000Z' }), {
      errors: { start: 'required', end: 'beforeStart' },
      showErrors: true,
    });
    expect(screen.getByText('The start date and time are required.')).toBeInTheDocument();
    expect(screen.getByText('The end must not be before the start.')).toBeInTheDocument();
    expect(field('End time')).toHaveAttribute('aria-invalid', 'true');
  });

  it('cancels and confirms through its own buttons', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    open(event(), { onCancel, onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
