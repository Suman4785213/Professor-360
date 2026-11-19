import { useState } from "react";
import { Text } from "react-native";
import { router, Redirect, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { session } from "../src/services/runtime";
import { useSession } from "../src/store/session";
import { paths } from "../src/constants/roles";
import type { College } from "../src/types";
import { useDebounced } from "../src/hooks/useDebounced";
import {
  Brand,
  Screen,
  Input,
  Button,
  Card,
  Loading,
  ErrorState,
} from "../src/components/ui";
import { errorMessage } from "../src/services/errors";
export default function Institutions() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { user, select } = useSession();
  const result = useQuery({
    queryKey: ["colleges", q],
    queryFn: async ({ signal }) =>
      (
        await session.publicApi.get<{ results: College[] }>(
          "colleges/public/",
          { params: { q }, signal },
        )
      ).data.results,
  });
  if (user) return <Redirect href={paths[user.role] as Href} />;
  return (
    <Screen>
      <Brand />
      <Input
        label="Find your institution"
        value={search}
        onChangeText={setSearch}
      />
      {result.isPending && <Loading />}
      {result.error && (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      )}
      {result.data?.length === 0 && <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>No institutions found.</Text>}
      {result.data?.map((c) => (
        <Card key={c.id}>
          <Text style={{ color: "#192443", fontSize: 18, lineHeight: 26, fontWeight: "700" }}>{c.name}</Text>
          <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>
            {c.code} - {c.city}
          </Text>
          <Button
            title="Select institution"
            onPress={() => {
              select(c);
              router.push("/login");
            }}
          />
        </Card>
      ))}
      <Button
        title="Super Admin sign in"
        onPress={() => {
          select(null);
          router.push({
            pathname: "/login",
            params: { portal: "super-admin" },
          });
        }}
      />
    </Screen>
  );
}
