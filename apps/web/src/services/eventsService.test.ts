import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, type EventsConfig } from '@simple-site/interfaces';
import apiService from './apiService';
import { updateEvents } from './eventsService';

vi.mock('./apiService', () => ({ default: { put: vi.fn() } }));

const put = vi.mocked(apiService.put);

const events: EventsConfig = {
  events: [
    { slug: 'summer-festival', name: 'Summer Festival', startDateTime: '2027-06-18T15:00:00.000Z', location: 'Bordeaux' },
  ],
};

describe('updateEvents', () => {
  beforeEach(() => vi.resetAllMocks());

  it('PUTs the whole events block to the granular config endpoint', async () => {
    put.mockResolvedValue({ ok: true, data: { message: 'Events updated successfully' } } as never);
    await expect(updateEvents(events)).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledWith('config/events', events);
  });

  /**
   * The editors' auto-save reports failure from a REJECTION — an envelope that
   * merely says `ok: false` has to become one, or a refused write would be
   * reported to the admin as saved.
   */
  it('throws the server message when the envelope reports a failure', async () => {
    put.mockResolvedValue({
      ok: false,
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      timestamp: '2027-01-01T00:00:00.000Z',
    } as never);

    await expect(updateEvents(events)).rejects.toThrow('Validation failed');
  });

  it('lets a transport failure through untouched', async () => {
    put.mockRejectedValue(new Error('Network down'));
    await expect(updateEvents(events)).rejects.toThrow('Network down');
  });
});
