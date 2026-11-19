import { pageRows } from "./api";
import { DownloadButton } from "../../components/PrivateMedia";
import { Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { session } from "../../services/runtime";
import { useSession } from "../../store/session";
import { Button, Loading, ErrorState, Card } from "../../components/ui";
import { errorMessage } from "../../services/errors";
export type RecordData = { id?: string; [key: string]: unknown };
export function ServerData({ data }: { data: unknown }) {
  if (data == null) return null;
  if (typeof data === "string")
    return /^https?:|^\/|^file:/.test(data) ? null : <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>{data}</Text>;
  if (typeof data === "number" || typeof data === "boolean")
    return <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>{String(data)}</Text>;
  if (Array.isArray(data))
    return (
      <View style={{ gap: 8 }}>
        {data.map((x, i) => (
          <ServerData key={i} data={x} />
        ))}
      </View>
    );
  return (
    <View style={{ gap: 8 }}>
      {Object.entries(data as object)
        .filter(
          ([key]) =>
            ![
              "file",
              "download_url",
              "preview_url",
              "action_url",
              "avatar",
              "profile_photo",
              "resume",
              "resume_url",
              "filters_applied",
            ].includes(key),
        )
        .map(([k, v]) => (
          <View key={k}>
            <Text style={{ fontWeight: "700", color: "#352B88", fontSize: 13, lineHeight: 20, marginBottom: 4 }}>{k.replaceAll("_", " ")}</Text>
            <ServerData data={v} />
          </View>
        ))}
    </View>
  );
}
export function RemoteList({
  path,
  onOpen,
  filter,
}: {
  path: string;
  filter?: (row: RecordData) => boolean;
  onOpen?: (row: RecordData) => void;
}) {
  const user = useSession((s) => s.user);
  const result = useInfiniteQuery({
    queryKey: ["operations", user?.id, path],
    enabled: !!user,
    initialPageParam: path,
    queryFn: async ({ pageParam, signal }) =>
      (await session.api.get(pageParam, { signal })).data,
    getNextPageParam: (last) => last?.next || undefined,
  });
  return (
    <View style={{ gap: 12 }}>
      {result.isPending && <Loading />}
      {result.error && (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      )}
      <Button title="Refresh list" onPress={() => void result.refetch()} />
      {result.data?.pages.map((page, i) => {
        const rows = pageRows(page).results;
        return (
          <View key={i}>
            {!rows.length && <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>No records.</Text>}
            {(filter ? rows.filter(filter) : rows).map(
              (row: RecordData, n: number) => (
                <Card key={row.id || n}>
                  {onOpen ? (
                    <>
                      <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>
                        {String(
                          row.title ||
                            row.name ||
                            row.user_name ||
                            row.first_name ||
                            row.id ||
                            "Record",
                        )}
                      </Text>
                      <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>{String(row.status || row.priority || "")}</Text>
                      <Button title="Open" onPress={() => onOpen(row)} />
                    </>
                  ) : (
                    <>
                      <ServerData data={row} />
                      {typeof row.download_url === "string" && (
                        <DownloadButton url={row.download_url} />
                      )}
                    </>
                  )}
                </Card>
              ),
            )}
          </View>
        );
      })}
      {result.hasNextPage && (
        <Button
          title="Load more"
          disabled={result.isFetchingNextPage}
          onPress={() => void result.fetchNextPage()}
        />
      )}
    </View>
  );
}
