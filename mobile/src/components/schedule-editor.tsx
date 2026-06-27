/* eslint-disable react-hooks/immutability -- Reanimated shared-value `.value`
   mutations inside gesture/animated worklets are the intended API; the new
   react-hooks immutability rule flags them as false positives. */
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Button, Field } from "@/components/ui";
import { PressableScale } from "@/components/motion";
import { DateField, TimeField } from "@/components/pickers";
import { colors, fonts, gradients, radius } from "@/lib/theme";
import { formatTime } from "@/lib/format";
import {
  PRESETS,
  RAIL_END_MIN,
  RAIL_START_MIN,
  RAIL_TICKS,
  SNAP_MIN,
  WEEKDAY_LABELS,
  type Window,
  conflictsForReplace,
  dateBlockConflicts,
  mergeWindows,
  railFraction,
  slotCount,
  snap,
  toHHMM,
  toMinutes,
} from "@/lib/availability";

const RAIL_SPAN = RAIL_END_MIN - RAIL_START_MIN;
import type { AvailabilityRule, DoctorAppointmentRow } from "@/lib/types";

const ACCENT = colors.doctor;
const ACCENT_BG = colors.doctorBg;

/* -------------------------------------------------------------------------- */
/* Visual rail                                                                */
/* -------------------------------------------------------------------------- */

export function DayRail({
  windows,
  bookedMinutes = [],
  height = 24,
}: {
  windows: Window[];
  bookedMinutes?: number[];
  height?: number;
}) {
  return (
    <View style={[railStyles.track, { height }]}>
      {windows.map((w, i) => (
        <LinearGradient
          key={i}
          colors={gradients.doctor}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            railStyles.segment,
            {
              left: `${railFraction(w.startMin) * 100}%`,
              width: `${(railFraction(w.endMin) - railFraction(w.startMin)) * 100}%`,
            },
          ]}
        />
      ))}
      {bookedMinutes.map((m, i) => (
        <View
          key={`b${i}`}
          style={[railStyles.dot, { left: `${railFraction(m) * 100}%`, top: height / 2 - 3 }]}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Editable rail — smooth draggable handles (Reanimated)                      */
/* -------------------------------------------------------------------------- */

function EditableRail({
  windows,
  railW,
  onLayout,
  onCommit,
}: {
  windows: Window[];
  railW: number;
  onLayout: (w: number) => void;
  onCommit: (index: number, startMin: number, endMin: number) => void;
}) {
  return (
    <View
      style={railStyles.editorTrack}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
    >
      {windows.map((w, i) => (
        <DraggableBlock key={i} w={w} index={i} railW={railW} onCommit={onCommit} />
      ))}
      {windows.length === 0 ? (
        <Text style={railStyles.emptyHint}>Add hours below, then drag to adjust</Text>
      ) : null}
    </View>
  );
}

function DraggableBlock({
  w,
  index,
  railW,
  onCommit,
}: {
  w: Window;
  index: number;
  railW: number;
  onCommit: (index: number, startMin: number, endMin: number) => void;
}) {
  const start = useSharedValue(w.startMin);
  const end = useSharedValue(w.endMin);
  const s0 = useSharedValue(0);
  const e0 = useSharedValue(0);

  // Re-seed when the committed window changes from outside (presets, remove).
  useEffect(() => {
    start.value = w.startMin;
    end.value = w.endMin;
  }, [w.startMin, w.endMin, start, end]);

  const commit = (s: number, e: number) => onCommit(index, snap(s), snap(e));

  const moveGesture = Gesture.Pan()
    .onBegin(() => {
      s0.value = start.value;
      e0.value = end.value;
    })
    .onUpdate((ev) => {
      const d = (ev.translationX / Math.max(railW, 1)) * RAIL_SPAN;
      const dur = e0.value - s0.value;
      let ns = s0.value + d;
      if (ns < RAIL_START_MIN) ns = RAIL_START_MIN;
      if (ns + dur > RAIL_END_MIN) ns = RAIL_END_MIN - dur;
      start.value = ns;
      end.value = ns + dur;
    })
    .onEnd(() => {
      runOnJS(commit)(start.value, end.value);
    });

  const startGesture = Gesture.Pan()
    .onBegin(() => {
      s0.value = start.value;
    })
    .onUpdate((ev) => {
      const d = (ev.translationX / Math.max(railW, 1)) * RAIL_SPAN;
      let ns = s0.value + d;
      if (ns < RAIL_START_MIN) ns = RAIL_START_MIN;
      if (ns > end.value - SNAP_MIN) ns = end.value - SNAP_MIN;
      start.value = ns;
    })
    .onEnd(() => {
      runOnJS(commit)(start.value, end.value);
    });

  const endGesture = Gesture.Pan()
    .onBegin(() => {
      e0.value = end.value;
    })
    .onUpdate((ev) => {
      const d = (ev.translationX / Math.max(railW, 1)) * RAIL_SPAN;
      let ne = e0.value + d;
      if (ne > RAIL_END_MIN) ne = RAIL_END_MIN;
      if (ne < start.value + SNAP_MIN) ne = start.value + SNAP_MIN;
      end.value = ne;
    })
    .onEnd(() => {
      runOnJS(commit)(start.value, end.value);
    });

  const blockStyle = useAnimatedStyle(() => {
    const f = (v: number) =>
      (Math.max(RAIL_START_MIN, Math.min(RAIL_END_MIN, v)) - RAIL_START_MIN) / RAIL_SPAN;
    return {
      left: `${f(start.value) * 100}%`,
      width: `${(f(end.value) - f(start.value)) * 100}%`,
    };
  });

  return (
    <Animated.View style={[railStyles.block, blockStyle]}>
      <GestureDetector gesture={moveGesture}>
        <LinearGradient
          colors={gradients.doctor}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={railStyles.blockFill}
        />
      </GestureDetector>
      <GestureDetector gesture={startGesture}>
        <View style={[railStyles.handle, railStyles.handleLeft]}>
          <View style={railStyles.handleBar} />
        </View>
      </GestureDetector>
      <GestureDetector gesture={endGesture}>
        <View style={[railStyles.handle, railStyles.handleRight]}>
          <View style={railStyles.handleBar} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Bottom-sheet shell                                                         */
/* -------------------------------------------------------------------------- */

function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.root}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.grab} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={sheetStyles.content}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SheetLabel({ children }: { children: React.ReactNode }) {
  return <Text style={sheetStyles.fieldLabel}>{children}</Text>;
}

/* -------------------------------------------------------------------------- */
/* Hours editor                                                               */
/* -------------------------------------------------------------------------- */

export function HoursEditorSheet({
  visible,
  slotMinutes,
  rules,
  appointments,
  initialWeekday,
  initialWindows,
  onClose,
  onApply,
}: {
  visible: boolean;
  slotMinutes: number;
  rules: AvailabilityRule[];
  appointments: DoctorAppointmentRow[];
  initialWeekday: number;
  initialWindows: Window[];
  onClose: () => void;
  onApply: (days: number[], windows: Window[]) => void;
}) {
  const [days, setDays] = useState<number[]>([initialWeekday]);
  const [windows, setWindows] = useState<Window[]>(initialWindows);
  const [confirming, setConfirming] = useState(false);
  const [railW, setRailW] = useState(0);

  const editing = mergeWindows(windows);

  const commitWindow = (index: number, startMin: number, endMin: number) =>
    setWindows((prev) => prev.map((w, j) => (j === index ? { startMin, endMin } : w)));
  const slots = slotCount(editing, slotMinutes);
  const conflicts = useMemo(
    () => conflictsForReplace(rules, appointments, days, editing),
    [rules, appointments, days, editing]
  );

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const addWindow = (startMin: number, endMin: number) =>
    setWindows((prev) => [...prev, { startMin, endMin }]);

  const updateWindow = (index: number, side: "start" | "end", hhmm: string) =>
    setWindows((prev) =>
      prev.map((w, j) =>
        j === index
          ? side === "start"
            ? { ...w, startMin: toMinutes(hhmm) }
            : { ...w, endMin: toMinutes(hhmm) }
          : w
      )
    );

  const removeWindow = (index: number) =>
    setWindows((prev) => prev.filter((_, j) => j !== index));

  const save = () => {
    if (conflicts.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    onApply([...days].sort((a, b) => a - b), editing);
  };

  const dayChip = (d: number) => {
    const active = days.includes(d);
    return (
      <PressableScale
        key={d}
        onPress={() => toggleDay(d)}
        haptic="light"
        style={[sheetStyles.dayChip, active && sheetStyles.dayChipActive]}
      >
        <Text style={[sheetStyles.dayChipText, active && sheetStyles.dayChipTextActive]}>
          {WEEKDAY_LABELS[d]}
        </Text>
      </PressableScale>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={sheetStyles.title}>
        {initialWindows.length > 0 ? `${WEEKDAY_LABELS[initialWeekday]} hours` : "Add hours"}
      </Text>

      <View style={sheetStyles.ruler}>
        {RAIL_TICKS.map((t) => (
          <Text key={t} style={sheetStyles.tick}>
            {t}
          </Text>
        ))}
      </View>
      <EditableRail windows={windows} railW={railW} onLayout={setRailW} onCommit={commitWindow} />
      <Text style={sheetStyles.hint}>
        {editing.length > 0
          ? `${slots} slot${slots === 1 ? "" : "s"} per day · ${slotMinutes}-min consults`
          : `${slotMinutes}-minute consultations`}
      </Text>

      {windows.length > 0 ? (
        <View style={sheetStyles.windowList}>
          {windows.map((w, i) => (
            <View key={i} style={sheetStyles.windowRow}>
              <TimeField value={toHHMM(w.startMin)} onChange={(v) => updateWindow(i, "start", v)} />
              <Text style={sheetStyles.dash}>–</Text>
              <TimeField value={toHHMM(w.endMin)} onChange={(v) => updateWindow(i, "end", v)} />
              <Pressable
                accessibilityLabel="Remove window"
                hitSlop={8}
                onPress={() => removeWindow(i)}
                style={sheetStyles.removeBtn}
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <SheetLabel>QUICK ADD</SheetLabel>
      <View style={sheetStyles.presetRow}>
        {PRESETS.map((p) => (
          <PressableScale
            key={p.key}
            onPress={() => addWindow(p.startMin, p.endMin)}
            haptic="light"
            style={sheetStyles.preset}
          >
            <Text style={sheetStyles.presetText}>＋ {p.label}</Text>
            <Text style={sheetStyles.presetSub}>{p.sublabel}</Text>
          </PressableScale>
        ))}
        <PressableScale
          onPress={() => addWindow(540, 780)}
          haptic="light"
          style={[sheetStyles.preset, sheetStyles.presetOutline]}
        >
          <Text style={[sheetStyles.presetText, { color: ACCENT }]}>＋ Custom</Text>
        </PressableScale>
      </View>

      <SheetLabel>ALSO APPLY TO</SheetLabel>
      <View style={sheetStyles.dayRow}>{[1, 2, 3, 4, 5, 6, 0].map(dayChip)}</View>

      {conflicts.length > 0 ? (
        <ConflictWarning
          conflicts={conflicts}
          note="This won't cancel their visit — message them if you need to reschedule."
          countLabel="affected"
        />
      ) : null}

      <Button
        label={
          conflicts.length > 0 && confirming
            ? "Save anyway"
            : days.length > 1
              ? `Save · ${days.length} days`
              : "Save hours"
        }
        icon="check"
        onPress={save}
      />
      <Button label="Cancel" tone="ghost" onPress={onClose} />
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Exception sheet (time off / extra clinic)                                  */
/* -------------------------------------------------------------------------- */

export interface ExceptionPayload {
  date: string;
  kind: "blocked" | "extra";
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export function ExceptionSheet({
  visible,
  mode,
  appointments,
  onClose,
  onApply,
}: {
  visible: boolean;
  mode: "off" | "extra";
  appointments: DoctorAppointmentRow[];
  onClose: () => void;
  onApply: (payload: ExceptionPayload) => void;
}) {
  const off = mode === "off";
  const [date, setDate] = useState("");
  const [allDay, setAllDay] = useState(off);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const conflicts = useMemo(() => {
    if (!off || !date) return [];
    const range = allDay ? undefined : { startMin: toMinutes(start), endMin: toMinutes(end) };
    return dateBlockConflicts(appointments, date, range);
  }, [off, date, allDay, start, end, appointments]);

  const needsTimes = !off || !allDay;
  const valid = Boolean(date) && (!needsTimes || toMinutes(end) > toMinutes(start));

  const save = () => {
    if (off && conflicts.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    onApply({
      date,
      kind: off ? "blocked" : "extra",
      startTime: off && allDay ? null : start,
      endTime: off && allDay ? null : end,
      reason: reason.trim() || null,
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={sheetStyles.title}>{off ? "Take time off" : "Add a one-off clinic"}</Text>
      <Text style={sheetStyles.sub}>
        {off
          ? "Block a date so patients can't book it."
          : "Open extra hours on a single date, outside your weekly pattern."}
      </Text>

      <View style={{ marginTop: 14 }}>
        <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} />
      </View>

      {off ? (
        <PressableScale onPress={() => setAllDay((v) => !v)} haptic="light" style={sheetStyles.toggleRow}>
          <MaterialCommunityIcons
            name={allDay ? "checkbox-marked" : "checkbox-blank-outline"}
            size={23}
            color={allDay ? ACCENT : colors.textMuted}
          />
          <Text style={sheetStyles.toggleText}>Off the whole day</Text>
        </PressableScale>
      ) : null}

      {needsTimes ? (
        <View style={sheetStyles.timeRow}>
          <TimeField label="Start" value={start} onChange={setStart} />
          <TimeField label="End" value={end} onChange={setEnd} />
        </View>
      ) : null}

      <Field
        label="Reason (optional)"
        value={reason}
        onChangeText={setReason}
        placeholder={off ? "Holiday, conference…" : "Extra clinic"}
      />

      {conflicts.length > 0 ? (
        <ConflictWarning
          conflicts={conflicts}
          note="Blocking the day won't cancel them — message them if you need to reschedule."
          countLabel="that day"
        />
      ) : null}

      <Button
        label={off && conflicts.length > 0 && confirming ? "Block anyway" : off ? "Block this date" : "Add clinic"}
        icon="check"
        disabled={!valid}
        onPress={save}
      />
      <Button label="Cancel" tone="ghost" onPress={onClose} />
    </Sheet>
  );
}

function ConflictWarning({
  conflicts,
  note,
  countLabel,
}: {
  conflicts: DoctorAppointmentRow[];
  note: string;
  countLabel: string;
}) {
  return (
    <View style={sheetStyles.warn}>
      <View style={sheetStyles.warnHead}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.warning} />
        <Text style={sheetStyles.warnTitle}>
          {conflicts.length} booked visit{conflicts.length === 1 ? "" : "s"} {countLabel}
        </Text>
      </View>
      {conflicts.slice(0, 4).map((row) => (
        <Text key={row.appointment.id} style={sheetStyles.warnItem}>
          {row.patient.name || row.patient.email} · {formatTime(row.appointment.startsAt)}
        </Text>
      ))}
      <Text style={sheetStyles.warnNote}>{note}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const railStyles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  segment: { position: "absolute", top: 0, bottom: 0, borderRadius: 7 },
  dot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.doctorDark,
    marginLeft: -4.5,
  },
  // Editable rail (taller for comfortable dragging).
  editorTrack: {
    height: 60,
    backgroundColor: "#f3f0fc",
    borderWidth: 1,
    borderColor: "#e7defb",
    borderRadius: radius.md,
    position: "relative",
    justifyContent: "center",
  },
  emptyHint: {
    textAlign: "center",
    color: colors.textFaint,
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
  block: { position: "absolute", top: 7, bottom: 7 },
  blockFill: { flex: 1, borderRadius: 11 },
  handle: {
    position: "absolute",
    top: -7,
    bottom: -7,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  handleLeft: { left: -19 },
  handleRight: { right: -19 },
  handleBar: {
    width: 12,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9ccf7",
    shadowColor: "#4a2792",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
});

const sheetStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: "92%",
    paddingTop: 10,
  },
  grab: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
    marginBottom: 6,
  },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.5, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 13.5, color: colors.textMuted, lineHeight: 19, marginTop: -6 },
  ruler: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  tick: { fontFamily: fonts.mono, fontSize: 9, color: colors.textFaint },
  hint: { textAlign: "center", fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: -4 },
  fieldLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginTop: 4,
  },
  windowList: { gap: 9 },
  windowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dash: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.textMuted },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    backgroundColor: ACCENT_BG,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignItems: "center",
  },
  presetOutline: { backgroundColor: colors.card, borderWidth: 1, borderColor: "#ddd2f6" },
  presetText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.doctorDark },
  presetSub: { fontFamily: fonts.mono, fontSize: 10, color: ACCENT, marginTop: 1 },
  timeRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dayRow: { flexDirection: "row", gap: 6 },
  dayChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dayChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayChipText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textMuted },
  dayChipTextActive: { color: "#fff" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  toggleText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  warn: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#f0dcb0",
    padding: 13,
    gap: 5,
  },
  warnHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  warnTitle: { fontFamily: fonts.bodySemibold, fontSize: 13.5, color: colors.warning },
  warnItem: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  warnNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 2 },
});
