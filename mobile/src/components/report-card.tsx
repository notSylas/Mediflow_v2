import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { downloadAndShareProtectedFile } from "@/lib/files";
import { formatDateTime } from "@/lib/format";
import { API_URL, authClient } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";
import type { Report } from "@/lib/types";

export function ReportCard({
  report,
  title = "Attached report",
  compact,
}: {
  report: Report;
  title?: string;
  compact?: boolean;
}) {
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const isImage = report.mimeType.startsWith("image/");
  const cookie = authClient.getCookie();

  const open = async () => {
    setOpening(true);
    try {
      await downloadAndShareProtectedFile({
        path: `/api/reports/${report.id}`,
        filename: report.filename,
        mimeType: report.mimeType,
      });
    } catch {
      toast.error("Couldn't open this report. Please try again.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Card style={compact ? styles.compactCard : undefined}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialCommunityIcons
            name={isImage ? "image-outline" : "file-pdf-box"}
            size={20}
            color={colors.doctor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Body strong>{title}</Body>
          <Text style={styles.filename} numberOfLines={1}>
            {report.filename}
          </Text>
          {report.createdAt ? <Muted>{formatDateTime(report.createdAt)}</Muted> : null}
        </View>
      </View>
      {isImage ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          accessibilityLabel={report.filename}
          source={{
            uri: `${API_URL}/api/reports/${report.id}`,
            headers: cookie ? { Cookie: cookie } : undefined,
          }}
          resizeMode="cover"
          style={styles.preview}
        />
      ) : (
        <View style={styles.pdfHint}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={18}
            color={colors.textMuted}
          />
          <Text style={styles.pdfHintText}>
            PDF preview opens through the device share sheet.
          </Text>
        </View>
      )}
      <Button
        label="Open / share report"
        icon="open-in-new"
        tone="secondary"
        compact
        loading={opening}
        onPress={open}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  compactCard: { padding: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  filename: {
    color: colors.text,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    marginTop: 2,
  },
  preview: {
    width: "100%",
    height: 190,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  pdfHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pdfHintText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
});
