import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notifications from '@/components/ui/Notifications';
import { NotificationProvider, useNotify } from '@/lib/context/NotificationContext';

// Test component to trigger notifications
const NotificationTrigger = () => {
  const notify = useNotify();
  
  return (
    <div>
      <button onClick={() => notify.info('Info notification')} data-testid="show-info">
        Show Info
      </button>
      <button onClick={() => notify.success('Success notification')} data-testid="show-success">
        Show Success
      </button>
      <button onClick={() => notify.warning('Warning notification')} data-testid="show-warning">
        Show Warning
      </button>
      <button onClick={() => notify.error('Error notification')} data-testid="show-error">
        Show Error
      </button>
    </div>
  );
};

// Test wrapper with providers
const renderNotifications = () => {
  return render(
    <NotificationProvider>
      <Notifications />
      <NotificationTrigger />
    </NotificationProvider>
  );
};

describe('Notifications Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render notifications when triggered', async () => {
    renderNotifications();
    
    // No notifications initially
    expect(screen.queryByText('Info notification')).not.toBeInTheDocument();
    
    // Trigger a notification
    await userEvent.click(screen.getByTestId('show-info'));
    
    // Notification should be visible
    expect(screen.getByText('Info notification')).toBeInTheDocument();
  });

  it('should render different styles for different notification types', async () => {
    renderNotifications();
    
    // Trigger notifications of each type
    await userEvent.click(screen.getByTestId('show-info'));
    const infoNotification = screen.getByText('Info notification').closest('div');
    expect(infoNotification).toHaveClass('bg-blue-50');
    
    await userEvent.click(screen.getByTestId('show-success'));
    const successNotification = screen.getByText('Success notification').closest('div');
    expect(successNotification).toHaveClass('bg-green-50');
    
    await userEvent.click(screen.getByTestId('show-warning'));
    const warningNotification = screen.getByText('Warning notification').closest('div');
    expect(warningNotification).toHaveClass('bg-yellow-50');
    
    await userEvent.click(screen.getByTestId('show-error'));
    const errorNotification = screen.getByText('Error notification').closest('div');
    expect(errorNotification).toHaveClass('bg-red-50');
  });

  it('should automatically remove notifications after their duration', async () => {
    renderNotifications();
    
    // Trigger a notification
    await userEvent.click(screen.getByTestId('show-success'));
    
    // Notification should be visible
    expect(screen.getByText('Success notification')).toBeInTheDocument();
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3500); // Default success duration is 3000ms + buffer
    });
    
    // Notification should be removed
    await waitFor(() => {
      expect(screen.queryByText('Success notification')).not.toBeInTheDocument();
    });
  });

  it('should remove notification when close button is clicked', async () => {
    renderNotifications();
    
    // Trigger a notification
    await userEvent.click(screen.getByTestId('show-error'));
    
    // Find the close button and click it
    const closeButton = screen.getByText('Error notification')
      .closest('div')?.querySelector('button');
    
    await userEvent.click(closeButton!);
    
    // Wait for animation and removal
    act(() => {
      jest.advanceTimersByTime(350); // Animation duration + a bit
    });
    
    // Notification should be gone
    await waitFor(() => {
      expect(screen.queryByText('Error notification')).not.toBeInTheDocument();
    });
  });
});
