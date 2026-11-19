import { router, type Href } from "expo-router";
import { paths } from "../../constants/roles";
import { Text, View } from "react-native";
import { Card, Title, Button } from "../../components/ui";
import {
  StatisticCard,
  RecordCard,
  EmptyState,
  LoadingState,
  ErrorState,
} from "../../components/dashboard";
import type { User } from "../../types";
import { useDashboardSection } from "./useDashboard";
import {
  healthStats,
  overviewStats,
  type Section,
  type Listing,
  type Overview,
  type Participation,
} from "./contracts";
import { errorMessage } from "../../services/errors";
export function SectionView({
  user,
  section,
  preview = false,
}: {
  user: User;
  section: Section;
  preview?: boolean;
}) {
  const result = useDashboardSection(user, section);
  if (section.unavailable)
    return (
      <Card>
        <Title>{section.title}</Title>
        {section.id === "activities" && user.role === "FACULTY" && (
          <Button
            title="Create activity"
            onPress={() => router.push(`${paths[user.role]}/workflow` as Href)}
          />
        )}
        <Text>{section.unavailable}</Text>
      </Card>
    );
  if (!section.path)
    return (
      <Card>
        <Title>{section.title}</Title>
        {section.id === "activities" && user.role === "FACULTY" && (
          <Button
            title="Create activity"
            onPress={() => router.push(`${paths[user.role]}/workflow` as Href)}
          />
        )}
        <Text>Use the dashboard action below to open this workflow.</Text>
      </Card>
    );
  const data = result.data?.pages[0];
  return (
    <Card>
      <Title>{section.title}</Title>
      {section.id === "activities" && user.role === "FACULTY" && (
        <Button
          title="Create activity"
          onPress={() => router.push(`${paths[user.role]}/workflow` as Href)}
        />
      )}
      {result.isPending ? (
        <LoadingState />
      ) : result.error ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      ) : !data ? (
        <EmptyState />
      ) : section.kind === "overview" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {overviewStats(data as Overview, user.role === "FACULTY").map(
            (x, i) => (
              <StatisticCard key={i} {...x} />
            ),
          )}
        </View>
      ) : section.kind === "participation" ? (
        <View style={{ gap: 10 }}>
          <StatisticCard
            label="Activities"
            value={(data as Participation).total_activities}
          />
          <StatisticCard
            label="Verified activities"
            value={(data as Participation).verified_activities}
          />
          {user.role !== "FACULTY" && (
            <StatisticCard
              label="Participation %"
              value={(data as Participation).participation_rate_pct}
            />
          )}
          {(data as Participation).category_breakdown.map((c) => (
            <StatisticCard key={c.code} label={c.name} value={c.count} />
          ))}
        </View>
      ) : section.kind === "health" ? (
        <View style={{ gap: 10 }}>
          {healthStats(data as Record<string, unknown>).map((x) => (
            <StatisticCard key={x.label} {...x} />
          ))}
        </View>
      ) : (
        <>
          {(data as Listing).count !== undefined && (
            <Text>Server total: {(data as Listing).count}</Text>
          )}
          {(preview
            ? (data as Listing).results.slice(0, 3)
            : result.data!.pages.flatMap((p) => (p as Listing).results)
          ).map((row, i) => (
            <View key={row.id || i} style={{ gap: 10, marginBottom: 6 }}>
              <RecordCard row={row} />
              {["activities", "verification"].includes(section.id) &&
                row.id && (
                  <Button
                    title="Open activity / review"
                    onPress={() =>
                      router.push({
                        pathname: `${paths[user.role]}/workflow`,
                        params:
                          section.id === "verification"
                            ? { record: row.id }
                            : { id: row.id },
                      })
                    }
                  />
                )}
            </View>
          ))}
          {(data as Listing).results.length === 0 && <EmptyState />}
          {!preview && result.hasNextPage && (
            <Button
              title={result.isFetchingNextPage ? "Loading..." : "Load more"}
              disabled={result.isFetchingNextPage}
              onPress={() => void result.fetchNextPage()}
            />
          )}
        </>
      )}
    </Card>
  );
}
