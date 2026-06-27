import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";

/** Terms / Privacy links for settings screens — keeps the legal pages reachable
 *  from inside the authenticated app. */
export function LegalLinks() {
  return (
    <View style={styles.card}>
      <Row icon="file-document-outline" label="Terms of Service" href="/terms" />
      <View style={styles.divider} />
      <Row icon="shield-check-outline" label="Privacy Policy" href="/privacy" />
    </View>
  );
}

function Row({
  icon,
  label,
  href,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  href: "/terms" | "/privacy";
}) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={colors.textMuted} />
      <Text style={styles.label}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: { flex: 1, fontSize: 15, color: colors.text, fontFamily: fonts.bodyMedium },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },
});
