import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// A simple test component that uses the auth context
const TestComponent = () => {
  const { isAuthenticated, user, login, logout, updateUser } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      {user && <div data-testid="user-name">{user.name}</div>}
      <button 
        onClick={() => login({ email: 'test@example.com', password: 'password123' })} 
        data-testid="login-btn"
      >
        Login
      </button>
      <button 
        onClick={() => logout()} 
        data-testid="logout-btn"
      >
        Logout
      </button>
      <button 
        onClick={() => updateUser({ name: 'Updated Name' })} 
        data-testid="update-btn"
      >
        Update User
      </button>
    </div>
  );
};

// Wrap component in AuthProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
  });

  it('should start with unauthenticated state', () => {
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
  });

  it('should update auth state after login', async () => {
    renderWithProvider(<TestComponent />);
    
    // Perform login
    await userEvent.click(screen.getByTestId('login-btn'));
    
    // Check that the auth state was updated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-name')).toBeInTheDocument();
  });

  it('should clear auth state after logout', async () => {
    renderWithProvider(<TestComponent />);
    
    // Login and then logout
    await userEvent.click(screen.getByTestId('login-btn'));
    await userEvent.click(screen.getByTestId('logout-btn'));
    
    // Check that the auth state was cleared
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
  });

  it('should update user information', async () => {
    renderWithProvider(<TestComponent />);
    
    // Login first
    await userEvent.click(screen.getByTestId('login-btn'));
    
    // Then update user
    await userEvent.click(screen.getByTestId('update-btn'));
    
    // Check that the user info was updated
    expect(screen.getByTestId('user-name')).toHaveTextContent('Updated Name');
  });

  it('should persist auth state in localStorage', async () => {
    renderWithProvider(<TestComponent />);
    
    // Login
    await userEvent.click(screen.getByTestId('login-btn'));
    
    // Check that data was saved to localStorage
    expect(window.localStorage.getItem('auth')).not.toBeNull();
    
    // Clear the rendered component
    screen.unmount();
    
    // Render again and check if state is restored from localStorage
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });
});
