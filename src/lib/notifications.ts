import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { strings, type Locale } from './i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** One local reminder a day for the Daily Challenge (works offline, no server needed). */
export async function scheduleChallengeReminder(locale: Locale, on: boolean) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && !(await Notifications.requestPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Daily Challenge',
      // eslint-disable-next-line import/namespace -- re-exported through nested modules; tsc verifies it
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const s = strings[locale];
  await Notifications.scheduleNotificationAsync({
    content: { title: `⚡ ${s.dailyChallenge}`, body: s.slogan },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0, ...(Platform.OS === 'android' ? { channelId: 'daily' } : {}) },
  });
}
