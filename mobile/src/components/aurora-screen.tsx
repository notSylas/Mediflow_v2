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
  action,
  hero,
  refreshing,
  onRefresh,
  children,
}: {
  variant?: "patient" | "doctor";
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  /** Optional extra content rendered inside the hero (e.g. a stat strip). */
  hero?: React.ReactNode;
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
          action={action}
        >
          {hero}
        </AuroraHeader>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },
  body: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md },
});
