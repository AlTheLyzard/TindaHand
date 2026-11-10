import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/use-translation';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const { t } = useTranslation();
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">{t('navigation.explore')}</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            {t('starter.intro')}
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Button variant="secondary" fullWidth={false} iconPosition="trailing"
              icon={({ color }) => <SymbolView tintColor={color} name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }} size={12} />}>
              {t('starter.documentation')}
            </Button>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <Collapsible title={t('starter.routingTitle')}>
            <ThemedText type="small">
              {t('starter.routingPrefix')}<ThemedText type="code">src/app/index.tsx</ThemedText>{t('starter.and')}{' '}
              <ThemedText type="code">src/app/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              {t('starter.layoutPrefix')}<ThemedText type="code">src/app/_layout.tsx</ThemedText>{t('starter.layoutSuffix')}
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="linkPrimary">{t('common.learnMore')}</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title={t('starter.platformTitle')}>
            <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
              <ThemedText type="small">
                {t('starter.platformPrefix')}<ThemedText type="smallBold">w</ThemedText>{t('starter.platformSuffix')}
              </ThemedText>
              <Image
                source={require('@/assets/images/tutorial-web.png')}
                style={styles.imageTutorial}
              />
            </ThemedView>
          </Collapsible>

          <Collapsible title={t('starter.imagesTitle')}>
            <ThemedText type="small">
              {t('starter.imagesPrefix')}<ThemedText type="code">@2x</ThemedText>{t('starter.and')}{' '}
              <ThemedText type="code">@3x</ThemedText>{t('starter.imagesSuffix')}
            </ThemedText>
            <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={styles.imageReact} contentFit="contain" />
            <ExternalLink href="https://reactnative.dev/docs/images">
              <ThemedText type="linkPrimary">{t('common.learnMore')}</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title={t('starter.themeTitle')}>
            <ThemedText type="small">
              {t('starter.themePrefix')}
              <ThemedText type="code">useColorScheme()</ThemedText>{t('starter.themeSuffix')}
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="linkPrimary">{t('common.learnMore')}</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title={t('starter.animationsTitle')}>
            <ThemedText type="small">
              {t('starter.animationPrefix')}
              <ThemedText type="code">src/components/ui/collapsible.tsx</ThemedText>{t('starter.animationMiddle')}<ThemedText type="code">react-native-reanimated</ThemedText>{t('starter.animationSuffix')}
            </ThemedText>
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});
