import { useState } from "react";
import { View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuroraScreen } from "@/components/aurora-screen";
import { VaultDoctorConsentModal } from "@/components/vault-doctor-consent-modal";
import { Body, Button, Card, Muted } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiUpload } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { VaultRecordDTO } from "@/lib/vault-types";

export default function VaultAddRecord() {
  const toast = useToast();
  const [fileName, setFileName] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return null;
      const asset = result.assets[0];
      setFileName(asset.name);
      const body = new FormData();
      body.append(
        "file",
        { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "application/octet-stream" } as unknown as Blob
      );
      return apiUpload<{ record: VaultRecordDTO }>("/api/v1/patient/vault/records", body);
    },
    onSuccess: (data) => {
      if (!data) return;
      router.replace({
        pathname: "/(patient)/vault/records/[id]",
        params: { id: data.record.id, initial: JSON.stringify(data.record) },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <VaultDoctorConsentModal />
      <AuroraScreen
        variant="patient"
        compactHeader
        title="Add an old record"
        subtitle="From any doctor, any hospital — not just MediFlow"
      >
      <Card>
        <View style={{ alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons
            name="file-upload-outline"
            size={32}
            color={colors.primary}
            style={{ marginBottom: 4 }}
          />
          <Body strong>
            Photograph or pick a PDF of a prescription, lab report, or discharge summary
          </Body>
          <Muted>
            You&apos;ll review and confirm every detail before it&apos;s saved — nothing is added
            automatically.
          </Muted>
          {fileName ? <Muted>{fileName}</Muted> : null}
        </View>
        <Button
          label={upload.isPending ? "Reading document…" : "Choose a file"}
          icon="file-plus-outline"
          loading={upload.isPending}
          onPress={() => upload.mutate()}
        />
      </Card>
      </AuroraScreen>
    </>
  );
}
