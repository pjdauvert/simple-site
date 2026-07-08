import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsProvider } from '../../features/notifications/NotificationsProvider';
import messages from '../../features/i18n/i18n.json';
import { MediaUrlField } from './MediaUrlField';
import { listMedia } from '../../services/mediaService';

vi.mock('../../services/mediaService', () => ({ listMedia: vi.fn() }));

const en = messages.en as Record<string, string>;

const renderField = (props: Partial<React.ComponentProps<typeof MediaUrlField>> = {}) =>
  render(
    <MemoryRouter>
      <IntlProvider locale="en" messages={en}>
        <NotificationsProvider>
          <MediaUrlField label="Logo URL" value="" onChange={() => {}} {...props} />
        </NotificationsProvider>
      </IntlProvider>
    </MemoryRouter>,
  );

describe('MediaUrlField', () => {
  beforeEach(() => {
    vi.mocked(listMedia).mockResolvedValue({ folders: [], files: [] });
  });

  it('shows the placeholder when the value is empty', () => {
    renderField({ value: '' });
    expect(screen.getByLabelText(en['page.manage.site.preview.empty'])).toBeInTheDocument();
    expect(screen.queryByAltText(en['page.manage.site.preview.alt'])).not.toBeInTheDocument();
  });

  it('previews the image (incl. a relative path) when a value is set', () => {
    renderField({ value: '/logo.svg' });
    const img = screen.getByAltText(en['page.manage.site.preview.alt']) as HTMLImageElement;
    expect(img).toHaveAttribute('src', '/logo.svg');
  });

  it('falls back to the placeholder when the image fails to load (404)', () => {
    renderField({ value: 'https://example.com/missing.png' });
    const img = screen.getByAltText(en['page.manage.site.preview.alt']);
    fireEvent.error(img);
    expect(screen.getByLabelText(en['page.manage.site.preview.empty'])).toBeInTheDocument();
    expect(screen.queryByAltText(en['page.manage.site.preview.alt'])).not.toBeInTheDocument();
  });

  it('hides the library button unless the picker is enabled', () => {
    renderField({ enablePicker: false });
    expect(
      screen.queryByRole('button', { name: en['page.manage.site.chooseFromLibrary'] }),
    ).not.toBeInTheDocument();
  });

  it('opens the media picker from the end-adornment button when enabled', async () => {
    renderField({ value: '', enablePicker: true });
    fireEvent.click(screen.getByRole('button', { name: en['page.manage.site.chooseFromLibrary'] }));
    await waitFor(() =>
      expect(screen.getByText(en['page.manage.site.picker.title'])).toBeInTheDocument(),
    );
    expect(listMedia).toHaveBeenCalled();
  });
});
