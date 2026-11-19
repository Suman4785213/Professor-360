import { useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { session } from "../services/runtime";
import { useSession } from "../store/session";
import { Button, Loading, ErrorState } from "./ui";
import { DownloadButton } from "./PrivateMedia";
import { errorMessage } from "../services/errors";
export function EvidenceFiles({ id }: { id: string }) {
  const user = useSession((s) => s.user);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["evidence-files", user?.id, id],
    enabled: open && !!user,
    queryFn: async ({ signal }) =>
      (
        await session.api.get<{
          supporting_documents: {
            id: string;
            file_name: string;
            download_url: string;
          }[];
        }>(`evidence/${id}/`, { signal })
      ).data.supporting_documents,
  });
  return (
    <View>
      <Button title="Evidence attachments" onPress={() => setOpen((x) => !x)} />
      {open && (
        <>
          {query.isPending && <Loading />}
          {query.error && (
            <ErrorState
              message={errorMessage(query.error)}
              retry={() => void query.refetch()}
            />
          )}
          {query.data?.length === 0 && <Text>No supporting documents.</Text>}
          {query.data?.map((d) => (
            <View key={d.id}>
              <Text>{d.file_name}</Text>
              <DownloadButton url={d.download_url} />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
