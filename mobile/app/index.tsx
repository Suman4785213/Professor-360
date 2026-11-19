import { Redirect, type Href } from "expo-router";
import { useSession } from "../src/store/session";
import { paths } from "../src/constants/roles";
import {
  Brand,
  Screen,
  Loading,
  ErrorState,
  Button,
} from "../src/components/ui";
import { restore, session } from "../src/services/runtime";
export default function Index() {
  const { user, ready, error } = useSession();
  if (!ready)
    return (
      <Screen>
        <Brand />
        <Loading />
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <Brand />
        <ErrorState message={error} retry={() => void restore()} />
        <Button title="Clear session" onPress={() => void session.clear()} />
      </Screen>
    );
  return (
    <Redirect href={(user ? paths[user.role] : "/institutions") as Href} />
  );
}
