import { router } from "expo-router";
import { Button, EmptyState, Screen } from "@/components/ui";

export default function NotFound() {
  return (
    <Screen>
      <EmptyState
        icon="map-marker-question-outline"
        title="Page not found"
        message="This page may have moved or the link is no longer valid."
        action={<Button label="Return home" compact onPress={() => router.replace("/")} />}
      />
    </Screen>
  );
}
