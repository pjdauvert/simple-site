import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../features/auth/AuthContext';
import type { AuthContextValue } from '../../features/auth/AuthContext';
import { ManagePage } from './ManagePage';

vi.mock('../../layouts/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderWithAuth(
  ui: React.ReactElement,
  contextValue: Partial<AuthContextValue> = {}
) {
  const defaults: AuthContextValue = {
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...defaults, ...contextValue }}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('AdminPage', () => {
  it("shows Hello {name} when user has a name", () => {
    renderWithAuth(<ManagePage />, {
      user: { id: 'u1', name: 'Alice', email: 'a@b.com' },
    });
    expect(screen.getByText('Hello Alice')).toBeInTheDocument();
  });

  it('falls back to email when name is absent', () => {
    renderWithAuth(<ManagePage />, {
      user: { id: 'u1', email: 'a@b.com' },
    });
    expect(screen.getByText('Hello a@b.com')).toBeInTheDocument();
  });

  it('calls logout() on button click', () => {
    const mockLogout = vi.fn();
    renderWithAuth(<ManagePage />, {
      user: { id: 'u1', email: 'a@b.com' },
      logout: mockLogout,
    });
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
