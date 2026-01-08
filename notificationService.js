import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  // Request notification permissions
  async requestPermissions() {
    if (!Device.isDevice) {
      alert('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Please enable notifications in Settings');
      return false;
    }

    return true;
  },

  // Schedule a notification for a link
  async scheduleReminder(linkTitle, linkUrl, date) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔗 Link Reminder',
          body: `Time to check: ${linkTitle}`,
          data: { url: linkUrl },
          sound: true,
        },
        trigger: {
          date: new Date(date),
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  },

  // Cancel a scheduled notification
  async cancelReminder(notificationId) {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  },

  // Get all scheduled notifications
  async getAllScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  },
};
