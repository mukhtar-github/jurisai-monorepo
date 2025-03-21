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
      <button onClick={() => notify.info('Info message')} data-testid="info-btn">
        Show Info
      </button>
      <button onClick={() => notify.success('Success message')} data-testid="success-btn">
        Show Success
      </button>
      <button onClick={() => notify.warning('Warning message')} data-testid="warning-btn">
        Show Warning
      </button>
      <button onClick={() => notify.error('Error message')} data-testid="error-btn">
        Show Error
      </button>
      <div data-testid="notification-count">{notifications.length}</div>
    </div>
  );
};

// Wrap component in NotificationProvider
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
    renderWithProvider(<TestComponent />);
    
    // Check initial state - no notifications
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    
    // Add a notification
    await userEvent.click(screen.getByTestId('info-btn'));
    
    // Check that a notification was added
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('should automatically remove notifications after their duration', async () => {
    renderWithProvider(<TestComponent />);
    
    // Add a notification
    await userEvent.click(screen.getByTestId('success-btn'));
    
    // Check that a notification was added
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    
    // Fast-forward time to trigger auto-removal
    act(() => {
      jest.advanceTimersByTime(3500); // Default success duration is 3000ms + buffer
    });
    
    // Check that the notification was removed
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });
  });

  it('should be able to add multiple notifications', async () => {
    renderWithProvider(<TestComponent />);
    
    // Add multiple notifications
    await userEvent.click(screen.getByTestId('info-btn'));
    await userEvent.click(screen.getByTestId('warning-btn'));
    await userEvent.click(screen.getByTestId('error-btn'));
    
    // Check that all notifications were added
    expect(screen.getByTestId('notification-count')).toHaveTextContent('3');
  });
});
