import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_URL, authClient } from "@/lib/auth";

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function downloadAndShareProtectedFile({
  path,
  filename,
  mimeType,
}: {
  path: string;
  filename: string;
  mimeType: string;
}) {
  const cookie = authClient.getCookie();
  const target = `${FileSystem.cacheDirectory}${Date.now()}-${safeFilename(filename)}`;
  const { uri } = await FileSystem.downloadAsync(`${API_URL}${path}`, target, {
    headers: cookie ? { Cookie: cookie } : undefined,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: filename,
  });
}
