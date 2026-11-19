import { useMemo, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { session, queryClient } from "../services/runtime";
import { useSession } from "../store/session";
import { paths } from "../constants/roles";
import {
  Screen,
  Title,
  Card,
  Button,
  Loading,
  ErrorState,
} from "../components/ui";
import { PullToRefresh } from "../components/dashboard";
import { operationApi, notificationTarget } from "./operations/api";
import { errorMessage } from "../services/errors";
type Notice = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  notification_type: string;
  related_model?: string;
  related_id?: string;
  metadata?: Record<string, unknown>;
};
export default function Notifications() {
  const u = useSession((s) => s.user)!;
  const [expanded, setExpanded] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const api = useMemo(
    () =>
      operationApi(session.api, u, async () => {
        await Promise.all(
          ["notifications", "unread", "dashboard", "operations"].map((k) =>
            queryClient.invalidateQueries({ queryKey: [k] }),
          ),
        );
      }),
    [u],
  );
  const list = useInfiniteQuery({
    queryKey: ["notifications", u.id],
    initialPageParam: "notifications/",
    queryFn: async ({ pageParam, signal }) =>
      (
        await session.api.get<{ results: Notice[]; next: string | null }>(
          pageParam,
          { signal },
        )
      ).data,
    getNextPageParam: (p) => p.next || undefined,
    refetchInterval: 60000,
  });
  const unread = useQuery({
    queryKey: ["unread", u.id],
    queryFn: async () =>
      (
        await session.api.get<{ unread_count: number }>(
          "notifications/unread-count/",
        )
      ).data,
    refetchInterval: 60000,
  });
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      refreshControl={
        <PullToRefresh
          refreshing={list.isRefetching}
          onRefresh={() => {
            void list.refetch();
            void unread.refetch();
          }}
        />
      }
    >
      <Title>Notifications</Title>
      {unread.data && <Text>Unread: {unread.data.unread_count}</Text>}
      {list.isPending && <Loading />}
      {(list.error || unread.error) && (
        <ErrorState
          message={errorMessage(list.error || unread.error)}
          retry={() => {
            void list.refetch();
            void unread.refetch();
          }}
        />
      )}
      {!!error && <ErrorState message={error} />}
      <Button
        title="Mark all read"
        disabled={busy}
        onPress={() => void act(() => api.readAll())}
      />
      {list.data?.pages
        .flatMap((p) => p.results)
        .map((n) => (
          <Card key={n.id}>
            <Text style={{ fontWeight: "700" }}>{n.title}</Text>
            <Button
              title={expanded === n.id ? "Hide details" : "View details"}
              onPress={() => setExpanded(expanded === n.id ? undefined : n.id)}
            />
            {expanded === n.id && (
              <>
                <Text>{n.body}</Text>
                {!!n.metadata?.response && (
                  <Text>Response: {String(n.metadata.response)}</Text>
                )}
                {!n.is_read && (
                  <Button
                    title="Mark read"
                    disabled={busy}
                    onPress={() => void act(() => api.read(n.id))}
                  />
                )}
                {n.notification_type === "INCHARGE_REPORT_REQUEST" && (
                  <>
                    <Text>
                      Reporting period: see request message. No structured
                      period is supplied by this API.
                    </Text>
                    {["Okay", "Done", "No"].map((r) => (
                      <Button
                        key={r}
                        title={r}
                        disabled={busy}
                        onPress={() => void act(() => api.respond(n.id, r))}
                      />
                    ))}
                    <Button
                      title="My reports"
                      onPress={() =>
                        router.push({
                          pathname: `${paths[u.role]}/operations`,
                          params: { view: "reports" },
                        })
                      }
                    />
                  </>
                )}
                {notificationTarget(u, n) && (
                  <Button
                    title="Open related record"
                    onPress={() => {
                      const target = notificationTarget(u, n)!;
                      router.push({
                        pathname:
                          `${paths[u.role]}/${target.view === "activity" ? "workflow" : "operations"}`,
                        params:
                          target.view === "activity"
                            ? { id: target.id }
                            : { view: target.view, id: target.id },
                      });
                    }}
                  />
                )}
              </>
            )}
          </Card>
        ))}
      {list.data?.pages.every((p) => p.results.length === 0) && (
        <Text>No notifications.</Text>
      )}
      {list.hasNextPage && (
        <Button
          title="Load more"
          disabled={list.isFetchingNextPage}
          onPress={() => void list.fetchNextPage()}
        />
      )}
      <Button title="Dashboard" onPress={() => router.back()} />
    </Screen>
  );
}
