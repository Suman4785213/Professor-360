import { useLocalSearchParams, router } from "expo-router";
import { useSession } from "../../store/session";
import { sectionsFor } from "./contracts";
import Registration from "./Registration";
import Merge from "./Merge";
import { SectionView } from "./SectionView";
import { Screen, Button, ErrorState } from "../../components/ui";
export default function Detail() {
  const user = useSession((s) => s.user);
  const { section } = useLocalSearchParams();
  if (!user) return null;
  const found = sectionsFor(user).find((s) => s.id === section);
  return (
    <Screen>
      {found ? (
        found.id === "registration" ? (
          <Registration />
        ) : found.id === "merge" ? (
          <Merge />
        ) : (
          <SectionView user={user} section={found} />
        )
      ) : (
        <ErrorState message="This section is not available for your account." />
      )}
      <Button title="Back" onPress={() => router.back()} />
    </Screen>
  );
}
