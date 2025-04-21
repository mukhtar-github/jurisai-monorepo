/**
 * Notification Service for JurisAI
 * Provides utilities for displaying user notifications
 */

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top' | 'bottom';
  onClose?: () => void;
}

/**
 * Default notification options
 */
const defaultOptions: NotificationOptions = {
  duration: 5000,
  position: 'top-right'
};

/**
 * Shows a notification toast message
 * @param message - Notification message text
 * @param type - Type of notification (success, error, info, warning)
 * @param options - Additional notification options
 */
export const showNotification = (
  message: string,
  type: NotificationType = 'info',
  options: NotificationOptions = {}
): void => {
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.position = 'fixed';
  notification.style.zIndex = '9999';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.fontSize = '14px';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.justifyContent = 'space-between';
  notification.style.minWidth = '300px';
  notification.style.maxWidth = '450px';
  notification.style.animation = 'notification-slide-in 0.3s ease-out forwards';
  
  // Set position
  switch (mergedOptions.position) {
    case 'top-right':
      notification.style.top = '20px';
      notification.style.right = '20px';
      break;
    case 'top-left':
      notification.style.top = '20px';
      notification.style.left = '20px';
      break;
    case 'bottom-right':
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      break;
    case 'bottom-left':
      notification.style.bottom = '20px';
      notification.style.left = '20px';
      break;
    case 'top':
      notification.style.top = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      break;
    case 'bottom':
      notification.style.bottom = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      break;
  }
  
  // Set color based on type
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#10b981';
      notification.style.color = '#ffffff';
      break;
    case 'error':
      notification.style.backgroundColor = '#ef4444';
      notification.style.color = '#ffffff';
      break;
    case 'warning':
      notification.style.backgroundColor = '#f59e0b';
      notification.style.color = '#ffffff';
      break;
    case 'info':
    default:
      notification.style.backgroundColor = '#3b82f6';
      notification.style.color = '#ffffff';
      break;
  }
  
  // Create message container
  const messageContainer = document.createElement('div');
  messageContainer.textContent = message;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = 'inherit';
  closeButton.style.fontSize = '20px';
  closeButton.style.marginLeft = '16px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.opacity = '0.7';
  closeButton.style.padding = '0';
  closeButton.style.lineHeight = '1';
  
  closeButton.onmouseover = () => {
    closeButton.style.opacity = '1';
  };
  
  closeButton.onmouseout = () => {
    closeButton.style.opacity = '0.7';
  };
  
  const removeNotification = () => {
    notification.style.animation = 'notification-slide-out 0.3s ease-in forwards';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
        if (mergedOptions.onClose) {
          mergedOptions.onClose();
        }
      }
    }, 300);
  };
  
  closeButton.onclick = removeNotification;
  
  // Add content to notification
  notification.appendChild(messageContainer);
  notification.appendChild(closeButton);
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Add animation styles
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes notification-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes notification-slide-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Auto-remove after duration
  if (mergedOptions.duration) {
    setTimeout(removeNotification, mergedOptions.duration);
  }
};

/**
 * Shows a success notification
 * @param message - Success message
 * @param options - Notification options
 */
export const showSuccess = (
  message: string, 
  options?: NotificationOptions
): void => {
  showNotification(message, 'success', options);
};

/**
 * Shows an error notification
 * @param message - Error message
 * @param options - Notification options
 */
export const showError = (
  message: string, 
  options?: NotificationOptions
): void => {
  showNotification(message, 'error', options);
};

/**
 * Shows an info notification
 * @param message - Info message
 * @param options - Notification options
 */
export const showInfo = (
  message: string, 
  options?: NotificationOptions
): void => {
  showNotification(message, 'info', options);
};

/**
 * Shows a warning notification
 * @param message - Warning message
 * @param options - Notification options
 */
export const showWarning = (
  message: string, 
  options?: NotificationOptions
): void => {
  showNotification(message, 'warning', options);
};
