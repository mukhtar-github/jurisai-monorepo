import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NotificationProvider, useNotifications, useNotify } from '@/lib/context/NotificationContext';

// A simple test component that uses the notifications context
const TestComponent = () => {
  const { notifications } = useNotifications();
  const notify = useNotify();
  
  return (
    <div>
      <div data-testid="notification-count">{notifications.length}</div>
      <button 
        onClick={() => notify.info('Test notification', 'This is a test')}
        data-testid="info-btn"
      >
        Add Info
      </button>
      <button 
        onClick={() => notify.success('Success notification', 'This is a success', 3000)}
        data-testid="success-btn"
      >
        Add Success
      </button>
      <button 
        onClick={() => notify.warning('Warning notification', 'This is a warning')}
        data-testid="warning-btn"
      >
        Add Warning
      </button>
      <button 
        onClick={() => notify.error('Error notification', 'This is an error')}
        data-testid="error-btn"
      >
        Add Error
      </button>
    </div>
  );
};

// Helper to render with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<NotificationProvider>{ui}</NotificationProvider>);
};

describe('NotificationContext', () => {
  beforeEach(() => {
    // Setup - clear any previous renders
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should add a notification when useNotify is called', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderWithProvider(<TestComponent />);
    
    // Check initial state - no notifications
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    
    // Add a notification
    await user.click(screen.getByTestId('info-btn'));
    
    // Check that a notification was added
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
  }, 10000);

  it('should automatically remove notifications after their duration', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderWithProvider(<TestComponent />);
    
    // Add a notification
    await user.click(screen.getByTestId('success-btn'));
    
    // Check that a notification was added
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });
    
    // Fast-forward time to trigger auto-removal
    act(() => {
      jest.advanceTimersByTime(3500); // Default success duration is 3000ms + buffer
    });
    
    // Check that the notification was removed
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });
  }, 10000);

  it('should be able to add multiple notifications', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderWithProvider(<TestComponent />);
    
    // Add multiple notifications
    await user.click(screen.getByTestId('info-btn'));
    await user.click(screen.getByTestId('warning-btn'));
    await user.click(screen.getByTestId('error-btn'));
    
    // Check that all notifications were added
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('3');
    });
  }, 10000);
});
