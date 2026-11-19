import { Redirect, Stack, type Href } from "expo-router";
import { useSession } from "../../store/session";
import { paths, canEnter, type Role } from "../../constants/roles";
import { Screen, Loading } from "../../components/ui";
export default function RoleLayout({ role }: { role: Role }) {
  const { user, ready } = useSession();
  if (!ready)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!user) return <Redirect href="/" />;
  if (!canEnter(user.role, role))
    return <Redirect href={paths[user.role] as Href} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
