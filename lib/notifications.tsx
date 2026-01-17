'use client';

// Toast notification helpers using Mantine notifications
// Install: npm install @mantine/notifications
// Add to layout: import { Notifications } from '@mantine/notifications';

import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';

interface NotificationOptions {
  title?: string;
  message: string;
  autoClose?: number | false;
}

/**
 * Show success notification
 */
export function showSuccess(options: NotificationOptions): void {
  notifications.show({
    title: options.title || 'Success',
    message: options.message,
    color: 'green',
    icon: <IconCheck size={18} />,
    autoClose: options.autoClose !== undefined ? options.autoClose : 4000,
  });
}

/**
 * Show error notification
 */
export function showError(options: NotificationOptions): void {
  notifications.show({
    title: options.title || 'Error',
    message: options.message,
    color: 'red',
    icon: <IconX size={18} />,
    autoClose: options.autoClose !== undefined ? options.autoClose : 6000,
  });
}

/**
 * Show warning notification
 */
export function showWarning(options: NotificationOptions): void {
  notifications.show({
    title: options.title || 'Warning',
    message: options.message,
    color: 'yellow',
    icon: <IconAlertTriangle size={18} />,
    autoClose: options.autoClose !== undefined ? options.autoClose : 5000,
  });
}

/**
 * Show info notification
 */
export function showInfo(options: NotificationOptions): void {
  notifications.show({
    title: options.title || 'Info',
    message: options.message,
    color: 'blue',
    icon: <IconInfoCircle size={18} />,
    autoClose: options.autoClose !== undefined ? options.autoClose : 4000,
  });
}

/**
 * Show loading notification (returns ID to update/close later)
 */
export function showLoading(message: string): string {
  const id = `loading-${Date.now()}`;
  notifications.show({
    id,
    loading: true,
    title: 'Loading',
    message,
    autoClose: false,
    withCloseButton: false,
  });
  return id;
}

/**
 * Update a loading notification to success
 */
export function updateSuccess(id: string, message: string): void {
  notifications.update({
    id,
    color: 'green',
    title: 'Success',
    message,
    icon: <IconCheck size={18} />,
    loading: false,
    autoClose: 4000,
  });
}

/**
 * Update a loading notification to error
 */
export function updateError(id: string, message: string): void {
  notifications.update({
    id,
    color: 'red',
    title: 'Error',
    message,
    icon: <IconX size={18} />,
    loading: false,
    autoClose: 6000,
  });
}

/**
 * Helper for API call with toast notifications
 * Automatically shows loading, success, or error notifications
 */
export async function withNotifications<T>(
  apiCall: () => Promise<T>,
  options: {
    loading: string;
    success: string | ((result: T) => string);
    error?: string | ((error: unknown) => string);
  }
): Promise<T> {
  const id = showLoading(options.loading);

  try {
    const result = await apiCall();
    const successMessage = typeof options.success === 'function'
      ? options.success(result)
      : options.success;
    updateSuccess(id, successMessage);
    return result;
  } catch (error) {
    const errorMessage = options.error
      ? typeof options.error === 'function'
        ? options.error(error)
        : options.error
      : 'An error occurred';
    updateError(id, errorMessage);
    throw error;
  }
}

/**
 * Helper for API call with simple success/error toast
 */
export async function withToast<T>(
  apiCall: () => Promise<T>,
  successMessage: string,
  errorMessage?: string
): Promise<T> {
  try {
    const result = await apiCall();
    showSuccess({ message: successMessage });
    return result;
  } catch (error) {
    showError({
      message: errorMessage || 'An error occurred',
    });
    throw error;
  }
}

// Usage examples:
//
// 1. Simple success/error:
//    await withToast(
//      () => apiClient.saveStory(title, content),
//      'Story saved successfully',
//      'Failed to save story'
//    );
//
// 2. With loading state:
//    await withNotifications(
//      () => apiClient.saveStory(title, content),
//      {
//        loading: 'Saving story...',
//        success: 'Story saved successfully!',
//        error: 'Failed to save story. Please try again.'
//      }
//    );
//
// 3. Manual control:
//    const id = showLoading('Saving...');
//    try {
//      await apiClient.saveStory(title, content);
//      updateSuccess(id, 'Saved!');
//    } catch (error) {
//      updateError(id, 'Failed to save');
//    }
