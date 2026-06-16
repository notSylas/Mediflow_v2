import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/lib/theme";

/** Native time picker backed by an "HH:MM" string. */
export function TimeField({
  label,
  value,
  onChange,
  placeholder = "Select time",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const onPicked = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "set" && picked) {
      const h = String(picked.getHours()).padStart(2, "0");
      const m = String(picked.getMinutes()).padStart(2, "0");
      onChange(`${h}:${m}`);
    }
  };
  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `Choose ${label}` : "Choose time"}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.68 }]}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value || placeholder}</Text>
        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
      </Pressable>
      {open ? (
        <View>
          <DateTimePicker
            value={parseTime(value)}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPicked}
          />
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Native date picker backed by a "YYYY-MM-DD" string. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = "Choose date",
  minimumDate,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const onPicked = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "set" && picked) {
      const y = picked.getFullYear();
      const mo = String(picked.getMonth() + 1).padStart(2, "0");
      const d = String(picked.getDate()).padStart(2, "0");
      onChange(`${y}-${mo}-${d}`);
    }
  };
  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `Choose ${label}` : "Choose date"}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.68 }]}
      >
        <Text style={value ? styles.value : styles.placeholder}>{value || placeholder}</Text>
        <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>
      {open ? (
        <View>
          <DateTimePicker
            value={value ? new Date(`${value}T12:00:00`) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={minimumDate}
            onChange={onPicked}
          />
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function parseTime(value: string): Date {
  const d = new Date();
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (match) {
    d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

const styles = StyleSheet.create({
  group: { gap: 7, flex: 1 },
  label: { fontSize: 13, fontFamily: fonts.bodySemibold, color: colors.text },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  placeholder: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 15 },
  done: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 4 },
  doneText: { color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 14 },
});
