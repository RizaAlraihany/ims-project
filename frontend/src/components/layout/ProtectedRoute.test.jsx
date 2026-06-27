import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { AuthContext } from '@/hooks/authContext'

function renderProtectedRoute(authValue, initialPath = '/inventory') {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedRoute permissions={['inventory.view']} />}>
            <Route path="/inventory" element={<div>Inventory Page</div>} />
          </Route>
          <Route path="/" element={<div>Dashboard Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    renderProtectedRoute({
      hasAllPermissions: vi.fn(),
      hasAnyPermission: vi.fn(),
      isAuthenticated: false,
    })

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects authenticated users without permission to dashboard', () => {
    renderProtectedRoute({
      hasAllPermissions: vi.fn(),
      hasAnyPermission: vi.fn(() => false),
      isAuthenticated: true,
    })

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('renders the protected page when the user has access', () => {
    renderProtectedRoute({
      hasAllPermissions: vi.fn(),
      hasAnyPermission: vi.fn(() => true),
      isAuthenticated: true,
    })

    expect(screen.getByText('Inventory Page')).toBeInTheDocument()
  })
})
