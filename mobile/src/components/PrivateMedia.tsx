import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { Button, Loading, ErrorState } from "./ui";
import {
  downloadPrivate,
  releasePrivate,
  sharePrivate,
} from "../services/privateFiles";
import { useSession } from "../store/session";
import { errorMessage } from "../services/errors";
export function DownloadButton({ url }: { url: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <View>
      <Button
        title={busy ? "Downloading..." : "Open / save file"}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setError("");
          void sharePrivate(url)
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
      {!!error && <ErrorState message={error} />}
    </View>
  );
}
export function PrivateAvatar({
  url,
  name,
}: {
  url?: string | null;
  name: string;
}) {
  const id = useSession((s) => s.user?.id);
  const [attempt, setAttempt] = useState(0);
  return (
    <AvatarContent
      key={`${id}:${url}:${attempt}`}
      url={url}
      name={name}
      retry={() => setAttempt((x) => x + 1)}
    />
  );
}
function AvatarContent({
  url,
  name,
  retry,
}: {
  url?: string | null;
  name: string;
  retry: () => void;
}) {
  const [uri, setUri] = useState<string>();
  const [busy, setBusy] = useState(!!url);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let release: () => void = () => {};
    if (url) {
      void downloadPrivate(url, true)
        .then(({ file }) => {
          if (disposed) {
            releasePrivate(file);
            return;
          }
          release = () => releasePrivate(file);
          setUri(file.uri);
        })
        .catch(() => {
          if (!disposed) setFailed(true);
        })
        .finally(() => {
          if (!disposed) setBusy(false);
        });
    }
    return () => {
      disposed = true;
      release();
    };
  }, [url]);
  return (
    <View>
      {busy ? (
        <Loading />
      ) : uri ? (
        <Image
          accessibilityLabel={`${name} profile image`}
          source={{ uri }}
          style={{ width: 80, height: 80, borderRadius: 24, borderWidth: 3, borderColor: "#E9E3FA" }}
          onError={() => {
            setUri(undefined);
            setFailed(true);
          }}
        />
      ) : (
        <Text accessibilityLabel="Fallback avatar" style={{ fontSize: 30, lineHeight: 42, fontWeight: "700", color: "#4835A3", backgroundColor: "#EDE8FB", padding: 18, borderRadius: 24, textAlign: "center", minWidth: 80, alignSelf: "flex-start" }}>
          {name.trim().slice(0, 1) || "?"}
        </Text>
      )}
      {failed && <Button title="Retry profile image" onPress={retry} />}
    </View>
  );
}
