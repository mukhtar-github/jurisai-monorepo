import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Notifications from '@/components/ui/Notifications';
import { NotificationProvider, useNotify } from '@/lib/context/NotificationContext';

// A simple test component that uses the notification context to trigger notifications
const TestTrigger = () => {
  const notify = useNotify();
  
  return (
    <div>
      <button 
        onClick={() => notify.info('Info notification', 'This is an info notification')}
        data-testid="show-info"
      >
        Show Info
      </button>
      <button 
        onClick={() => notify.success('Success notification', 'This is a success notification')}
        data-testid="show-success"
      >
        Show Success
      </button>
      <button 
        onClick={() => notify.warning('Warning notification', 'This is a warning notification')}
        data-testid="show-warning"
      >
        Show Warning
      </button>
      <button 
        onClick={() => notify.error('Error notification', 'This is an error notification')}
        data-testid="show-error"
      >
        Show Error
      </button>
    </div>
  );
};

// Render the component with notification provider
const renderNotifications = () => {
  return render(
    <NotificationProvider>
      <Notifications />
      <TestTrigger />
    </NotificationProvider>
  );
};

describe('Notifications Component', () => {
  beforeEach(() => {
    // Setup - clear any previous renders
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render without any notifications by default', () => {
    renderNotifications();
    
    // Should render but have no notification items
    const notificationElement = screen.getByTestId('notifications-container');
    expect(notificationElement).toBeInTheDocument();
    expect(screen.queryByTestId('notification-item')).not.toBeInTheDocument();
  });

  it('should render notifications when triggered', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderNotifications();
    
    // No notifications initially
    expect(screen.queryByTestId('notification-item')).not.toBeInTheDocument();
    
    // Trigger a notification
    await user.click(screen.getByTestId('show-info'));
    
    // Should show notification
    await waitFor(() => {
      expect(screen.getByText('Info notification')).toBeInTheDocument();
    });
  }, 10000);

  it('should render different styles for different notification types', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderNotifications();
    
    // Trigger notifications of each type
    await user.click(screen.getByTestId('show-success'));
    
    // Should apply correct styles for success
    await waitFor(() => {
      expect(screen.getByText('Success notification')).toBeInTheDocument();
      // Find the container that has the background color by finding the root notification div
      const successNotification = screen.getByText('Success notification')
        .closest('div.p-4')  // This is the inner flex div
        ?.parentElement;     // The parent is the div with background styles
      
      expect(successNotification?.className).toContain('bg-green-50');
    });
    
    // Clear and try error
    act(() => {
      jest.runAllTimers();
    });
    
    await user.click(screen.getByTestId('show-error'));
    
    // Should apply correct styles for error
    await waitFor(() => {
      expect(screen.getByText('Error notification')).toBeInTheDocument();
      // Find the container that has the background color
      const errorNotification = screen.getByText('Error notification')
        .closest('div.p-4')  // This is the inner flex div
        ?.parentElement;     // The parent is the div with background styles
      
      expect(errorNotification?.className).toContain('bg-red-50');
    });
  }, 10000);

  it('should automatically remove notifications after their duration', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderNotifications();
    
    // Trigger a notification
    await user.click(screen.getByTestId('show-success'));
    
    // Notification should be visible
    await waitFor(() => {
      expect(screen.getByText('Success notification')).toBeInTheDocument();
    });
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3500); // Default duration is 3000ms + buffer
    });
    
    // Notification should be removed
    await waitFor(() => {
      expect(screen.queryByText('Success notification')).not.toBeInTheDocument();
    });
  }, 10000);

  it('should remove notification when close button is clicked', async () => {
    // Setup user event
    const user = userEvent.setup({ delay: null });
    renderNotifications();
    
    // Trigger a notification
    await user.click(screen.getByTestId('show-error'));
    
    // Notification should be visible
    await waitFor(() => {
      expect(screen.getByText('Error notification')).toBeInTheDocument();
    });
    
    // Find the close button using data-testid
    const closeButton = screen.getByTestId('close-notification');
    expect(closeButton).toBeInTheDocument();
    
    // Click close button
    await user.click(closeButton);
    
    // Notification should be removed
    await waitFor(() => {
      expect(screen.queryByText('Error notification')).not.toBeInTheDocument();
    });
  }, 10000);
});
