import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Field } from "@/components/ui";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { searchFormulary, type FormularyEntry } from "@/lib/formulary";

/**
 * Medicine name input with a live formulary dropdown. Suggestions render
 * in-flow directly under the field (reliable inside a ScrollView). Selecting a
 * suggestion fills name + strength + route via `onSelect`.
 */
export function MedicineNameField({
  value,
  onChangeText,
  onSelect,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSelect: (entry: FormularyEntry) => void;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = focused ? searchFormulary(value) : [];
  const open = focused && suggestions.length > 0;

  return (
    <View style={styles.wrap}>
      <Field
        label="Medicine"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        // Delay so a suggestion tap registers before the list closes.
        onBlur={() => setTimeout(() => setFocused(false), 140)}
        placeholder="Start typing a medicine…"
        autoCapitalize="words"
        autoCorrect={false}
      />
      {open ? (
        <View style={styles.dropdown}>
          {suggestions.map((entry, i) => (
            <Pressable
              key={entry.name}
              accessibilityRole="button"
              onPress={() => {
                onSelect(entry);
                setFocused(false);
              }}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.rowBorder,
                pressed && { backgroundColor: colors.doctorBg },
              ]}
            >
              <View style={styles.pill}>
                <MaterialCommunityIcons name="pill" size={16} color={colors.doctor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{entry.name}</Text>
                <Text style={styles.meta}>
                  {entry.klass} · {entry.strengths.slice(0, 3).join(", ")}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-top-left" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0, position: "relative", zIndex: 10 },
  dropdown: {
    marginTop: 6,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    ...shadow,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13, paddingVertical: 11 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pill: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.bodySemibold, fontSize: 14.5, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
});
