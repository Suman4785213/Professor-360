import { useState } from "react";
import { router, type Href } from "expo-router";
import { useSession } from "../store/session";
import { paths } from "../constants/roles";
import { session, queryClient } from "../services/runtime";
import { Screen, Button, ErrorState } from "../components/ui";
import {
  DashboardHeader,
  WelcomeCard,
  QuickActionGrid,
  PullToRefresh,
} from "../components/dashboard";
import {
  sectionsFor,
  contextError,
  refreshSections,
} from "./dashboards/contracts";
import { SectionView } from "./dashboards/SectionView";
export default function Dashboard() {
  const user = useSession((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  if (!user) return null;
  const error = contextError(user);
  const sections = sectionsFor(user);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshSections([
        () =>
          queryClient.refetchQueries({
            queryKey: ["dashboard", user.id],
            type: "active",
          }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <Screen
      refreshControl={
        <PullToRefresh
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
      }
    >
      <DashboardHeader user={user} />
      <WelcomeCard user={user} />
      {error && <ErrorState message={error} />}
      <QuickActionGrid
        actions={[
          {
            title: "My profile",
            onPress: () => router.push(`${paths[user.role]}/profile` as Href),
          },
          {
            title: "Notifications",
            onPress: () =>
              router.push(`${paths[user.role]}/notifications` as Href),
          },
        ]}
      />
      {sections.map((section) => (
        <SectionView key={section.id} user={user} section={section} preview />
      ))}
      <QuickActionGrid
        actions={sections
          .filter((s) => !s.unavailable)
          .map((s) => ({
            title: `View ${s.title}`,
            onPress: () =>
              router.push({
                pathname: `${paths[user.role]}/section`,
                params: { section: s.id },
              }),
          }))}
      />
      <QuickActionGrid
        actions={[
          "reports",
          "tasks",
          ...(user.college ? ["accreditation"] : []),
        ].map((view) => ({
          title: `Open ${view}`,
          onPress: () =>
            router.push({
              pathname: `${paths[user.role]}/operations`,
              params: { view },
            }),
        }))}
      />
      <Button
        title="Sign out"
        onPress={() => void session.logout().catch(() => {})}
      />
    </Screen>
  );
}
