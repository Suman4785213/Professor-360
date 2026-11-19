import { useMemo, useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../store/session";
import { session, queryClient } from "../../services/runtime";
import { createMerge } from "./actions";
import { normalizeList } from "./contracts";
import { Button, Card, Loading, ErrorState } from "../../components/ui";
import { DownloadButton } from "../../components/PrivateMedia";
import { errorMessage } from "../../services/errors";
export default function Merge() {
  const u = useSession((s) => s.user)!;
  const merge = useMemo(() => createMerge(session.api, u), [u]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; download_url: string }>();
  const allowed =
    u.role === "DEPARTMENT_INCHARGE" && !!u.department && !!u.college;
  const list = useQuery({
    queryKey: ["merge-reports", u.id, u.department],
    enabled: allowed,
    queryFn: async () =>
      normalizeList(
        (await session.api.get("reports/incharge-stored-reports/")).data,
      ).results.filter((r) => r.output_format === "PDF" && !!r.faculty_id),
  });
  if (!allowed)
    return <ErrorState message="Assigned Department In-charge required." />;
  return (
    <Card>
      <Text>Select completed faculty PDF reports</Text>
      {list.isPending && <Loading />}
      {list.error && (
        <ErrorState
          message={errorMessage(list.error)}
          retry={() => void list.refetch()}
        />
      )}
      {list.data?.length === 0 && <Text>No stored faculty reports.</Text>}
      {list.data?.map((r) => (
        <Button
          key={r.id}
          disabled={busy || !!result}
          title={`${selected.includes(r.id!) ? "Selected: " : ""}${r.title || r.faculty_name}`}
          onPress={() =>
            setSelected((x) =>
              x.includes(r.id!) ? x.filter((id) => id !== r.id) : [...x, r.id!],
            )
          }
        />
      ))}
      {error && <ErrorState message={error} />}
      <Button
        title={busy ? "Merging on server..." : "Merge selected reports"}
        disabled={busy || !selected.length || !!result}
        onPress={() => {
          setBusy(true);
          setError("");
          void merge(selected)
            .then((r) => {
              setResult(r);
              void queryClient.invalidateQueries({
                queryKey: ["dashboard", u.id],
              });
            })
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
      {result && (
        <>
          <Text>Report merged successfully.</Text>
          <DownloadButton url={result.download_url} />
        </>
      )}
    </Card>
  );
}
