import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "@/components/motion";
import { colors, fonts, radius, shadowSoft } from "@/lib/theme";
import { formatTime } from "@/lib/format";

interface DayGroup {
  key: string;
  date: Date;
  times: string[];
}

const PARTS: Array<{
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  test: (h: number) => boolean;
}> = [
  { label: "Morning", icon: "weather-sunset-up", test: (h) => h < 12 },
  { label: "Afternoon", icon: "weather-sunny", test: (h) => h >= 12 && h < 17 },
  { label: "Evening", icon: "weather-sunset-down", test: (h) => h >= 17 },
];

// 3 columns once the grid is wide enough to show a full time per pill,
// otherwise fall back to 2 so labels never clip.
const MIN_WIDTH_FOR_3 = 330;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Premium day-first slot picker. Patients pick a day from a roomy strip (Today
 * is labelled, each day shows how many times are open), then a time grouped by
 * part of day. Calm and scannable — never a raw grid, never bare counts.
 */
export function SlotPicker({
  slots,
  value,
  onChange,
}: {
  slots: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const [todayMs] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const days = useMemo<DayGroup[]>(() => {
    const map = new Map<string, string[]>();
    for (const s of slots) {
      const key = new Date(s).toDateString();
      (map.get(key) ?? map.set(key, []).get(key)!).push(s);
    }
    return [...map.entries()]
      .map(([key, times]) => ({ key, date: new Date(key), times: times.sort() }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [slots]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const active = days.find((d) => d.key === activeKey) ?? days[0];
  // Default to 3 once measured wide enough; 2 before measuring / on small screens.
  const columns = gridWidth >= MIN_WIDTH_FOR_3 ? 3 : 2;

  if (days.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="calendar-blank-outline" size={26} color={colors.textFaint} />
        <Text style={styles.emptyText}>No times available right now.</Text>
        <Text style={styles.emptySub}>Pull to refresh or check again shortly.</Text>
      </View>
    );
  }

  const dayDiff = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - todayMs) / 86400000);
  };

  const grouped = PARTS.map((part) => ({
    ...part,
    times: (active?.times ?? []).filter((t) => part.test(new Date(t).getHours())),
  })).filter((g) => g.times.length > 0);

  const activeCount = active?.times.length ?? 0;
  const activeLabel = active ? friendlyDate(active.date, dayDiff(active.date)) : "";

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.sectionLabel}>PICK A DAY</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
      >
        {days.map((day) => {
          const selected = day.key === active?.key;
          const diff = dayDiff(day.date);
          return (
            <PressableScale
              key={day.key}
              haptic="light"
              scaleTo={0.96}
              onPress={() => setActiveKey(day.key)}
              style={[styles.dayCard, selected && styles.dayCardActive]}
            >
              <Text style={[styles.dayWeekday, selected && styles.daySelectedText]}>
                {diff === 0 ? "TODAY" : WEEKDAYS[day.date.getDay()].toUpperCase()}
              </Text>
              <Text style={[styles.dayNum, selected && styles.daySelectedText]}>
                {day.date.getDate()}
              </Text>
              <Text style={[styles.dayMonth, selected && styles.daySelectedSub]}>
                {MONTHS[day.date.getMonth()]}
              </Text>
              <View style={[styles.dayPill, selected && styles.dayPillActive]}>
                <Text style={[styles.dayPillText, selected && styles.daySelectedText]}>
                  {day.times.length} open
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Clear plain-language summary of the chosen day. */}
      <View style={styles.summary}>
        <MaterialCommunityIcons name="calendar-check" size={18} color={colors.primary} />
        <Text style={styles.summaryDay}>{activeLabel}</Text>
        <Text style={styles.summaryCount}>
          {activeCount} {activeCount === 1 ? "time" : "times"} available
        </Text>
      </View>

      <View
        style={{ gap: 18 }}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {grouped.map((group) => (
          <View key={group.label} style={{ gap: 10 }}>
            <View style={styles.partHead}>
              <MaterialCommunityIcons name={group.icon} size={15} color={colors.primary} />
              <Text style={styles.partLabel}>{group.label}</Text>
            </View>
            {chunk(group.times, columns).map((row, ri) => (
              <View key={ri} style={styles.timeRow}>
                {row.map((t) => {
                  const selected = value === t;
                  return (
                    // The flex:1 wrapper controls width; PressableScale styles its
                    // inner view, so it can't be flexed directly.
                    <View key={t} style={{ flex: 1 }}>
                      <PressableScale
                        haptic="light"
                        scaleTo={0.96}
                        onPress={() => onChange(t)}
                        style={[styles.time, selected && styles.timeActive]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[styles.timeText, selected && styles.timeTextActive]}
                        >
                          {formatTime(t)}
                        </Text>
                      </PressableScale>
                    </View>
                  );
                })}
                {/* Pad the final row so columns stay aligned. */}
                {Array.from({ length: columns - row.length }).map((_, k) => (
                  <View key={`pad${k}`} style={{ flex: 1 }} />
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function friendlyDate(date: Date, diff: number): string {
  const md = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  if (diff === 0) return `Today, ${md}`;
  if (diff === 1) return `Tomorrow, ${md}`;
  return `${WEEKDAYS_FULL[date.getDay()]}, ${md}`;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    letterSpacing: 0.5,
    color: colors.textFaint,
  },
  dayStrip: { gap: 10, paddingVertical: 2, paddingRight: 4 },
  dayCard: {
    width: 78,
    paddingVertical: 13,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: "center",
    gap: 1,
    ...shadowSoft,
  },
  dayCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeekday: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
  dayNum: { fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.7, color: colors.text, marginTop: 2 },
  dayMonth: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  daySelectedText: { color: "#fff" },
  daySelectedSub: { color: "rgba(255,255,255,0.82)" },
  dayPill: {
    marginTop: 8,
    alignSelf: "stretch",
    marginHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
  },
  dayPillActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  dayPillText: { fontFamily: fonts.bodySemibold, fontSize: 10.5, color: colors.accentFg },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryDay: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  summaryCount: { marginLeft: "auto", fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.accentFg },
  partHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  partLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  timeRow: { flexDirection: "row", gap: 10 },
  time: {
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
  },
  timeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadowSoft,
    shadowColor: colors.primary,
  },
  timeText: { fontFamily: fonts.monoSemibold, fontSize: 14.5, letterSpacing: -0.4, color: colors.text },
  timeTextActive: { color: "#fff" },
  empty: { alignItems: "center", gap: 7, paddingVertical: 26 },
  emptyText: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
});
