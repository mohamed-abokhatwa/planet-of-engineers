import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { colors } from '../theme';
import { haptic } from './ui';

/** Opens a web page: in-app browser on phones, a real link on the web. */
export function ExternalLink({ href, children, label }: { href: string; children: ReactNode; label?: string }) {
  if (Platform.OS === 'web') {
    return (
      <Text accessibilityRole="link" {...({ href, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } } as object)}>
        {children}
      </Text>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => {
        haptic.light();
        WebBrowser.openBrowserAsync(href, { toolbarColor: colors.bg, controlsColor: colors.accent }).catch(() => {});
      }}
    >
      {children}
    </Pressable>
  );
}
