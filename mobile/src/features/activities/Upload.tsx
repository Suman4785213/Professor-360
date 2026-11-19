import { workflowError } from "./api";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as Picker from "expo-document-picker";
import * as Images from "expo-image-picker";
import { File } from "expo-file-system";
import { Button, ErrorState } from "../../components/ui";
import { session } from "../../services/runtime";
import { errorMessage } from "../../services/errors";
import {
  uploadEvidence,
  validateUpload,
  type PickedFile,
  type Activity,
} from "./api";
import type { User } from "../../types";
export function DocumentPickerField({
  a,
  user,
  refresh,
}: {
  a: Activity;
  user: User;
  refresh: () => Promise<unknown>;
}) {
  const [file, setFile] = useState<PickedFile>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [type, setType] = useState("CERTIFICATE");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function pick(image: boolean) {
    setError("");
    try {
      if (image) {
        const res = await Images.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
        });
        if (res.canceled) return;
        const item = res.assets[0];
        const f = new File(item.uri);
        setFile(
          validateUpload({
            uri: item.uri,
            name: item.fileName || f.name,
            size: f.size,
            mimeType: item.mimeType || f.type,
          }),
        );
      } else {
        const res = await Picker.getDocumentAsync({
          type: ["application/pdf", "image/jpeg", "image/png"],
          copyToCacheDirectory: true,
        });
        if (res.canceled) return;
        const item = res.assets[0];
        const f = new File(item.uri);
        setFile(
          validateUpload({
            uri: item.uri,
            name: item.name,
            size: item.size ?? f.size,
            mimeType: item.mimeType || f.type,
          }),
        );
      }
    } catch (e) {
      setError(workflowError(e) || errorMessage(e));
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Button
        title="Choose document"
        disabled={busy}
        onPress={() => void pick(false)}
      />
      <Button
        title="Choose image"
        disabled={busy}
        onPress={() => void pick(true)}
      />
      {file && (
        <Text>
          {file.name} - {file.size} bytes
        </Text>
      )}
      {["CERTIFICATE", "SUPPORTING", "OTHER"].map((t) => (
        <Button
          key={t}
          title={`${type === t ? "Selected: " : ""}${t}`}
          disabled={busy}
          onPress={() => setType(t)}
        />
      ))}
      {busy && <UploadProgressIndicator progress={progress} />}
      {error && <ErrorState message={error} />}
      <Button
        title={busy ? "Uploading..." : "Upload evidence"}
        disabled={busy || !file}
        onPress={() => {
          if (!file || controller.current) return;
          const abort = new AbortController();
          controller.current = abort;
          setBusy(true);
          setError("");
          setProgress(undefined);
          void uploadEvidence(
            session.api,
            user,
            a,
            file,
            type,
            abort.signal,
            setProgress,
            refresh,
          )
            .then(() => setFile(undefined))
            .catch((e) =>
              setError(
                abort.signal.aborted
                  ? "Upload cancelled. Refresh attachments before retrying."
                  : workflowError(e) || errorMessage(e),
              ),
            )
            .finally(() => {
              controller.current = null;
              setBusy(false);
            });
        }}
      />
      {busy && (
        <Button
          title="Cancel upload"
          onPress={() => controller.current?.abort()}
        />
      )}
    </View>
  );
}
export function UploadProgressIndicator({ progress }: { progress?: number }) {
  return (
    <Text accessibilityRole="progressbar">
      {progress === undefined ? "Upload in progress" : `Upload ${progress}%`}
    </Text>
  );
}
