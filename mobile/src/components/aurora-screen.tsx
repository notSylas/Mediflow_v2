import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuroraHeader } from "@/components/aurora-header";
import { colors, space } from "@/lib/theme";

/**
 * Standard list/detail screen with the aurora hero header and a padded,
 * scrollable body. Drop-in replacement for the old <Screen> + <PageHeader>
 * pairing so every screen shares the home-screen look.
 */
export function AuroraScreen({
  variant = "patient",
  title,
  subtitle,
  eyebrow,
  compactHeader = true,
  leading,
  action,
  hero,
  footer,
  refreshing,
  onRefresh,
  children,
}: {
  variant?: "patient" | "doctor";
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Secondary screens are compact by default. Set false only for a hero layout. */
  compactHeader?: boolean;
  leading?: React.ReactNode;
  action?: React.ReactNode;
  /** Optional extra content rendered inside the hero (e.g. a stat strip). */
  hero?: React.ReactNode;
  footer?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}) {
  const tint = variant === "doctor" ? colors.doctor : colors.primary;
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={tint}
            />
          ) : undefined
        }
      >
        <AuroraHeader
          variant={variant}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          compact={compactHeader}
          leading={leading}
          action={action}
        >
          {hero}
        </AuroraHeader>
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },
  body: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md,
    paddingTop: space.md,
    gap: space.md,
  },
  footer: {
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});
