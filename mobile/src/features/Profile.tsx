import { PrivateAvatar } from "../components/PrivateMedia";
import { Text } from "react-native";
import { router } from "expo-router";
import { useSession } from "../store/session";
import { Screen, Title, Card, Button } from "../components/ui";
export default function Profile() {
  const u = useSession((s) => s.user);
  return (
    <Screen>
      <Title>My profile</Title>
      <Card>
        <PrivateAvatar
          url={u?.faculty_profile?.profile_photo || u?.avatar}
          name={u?.first_name || "Profile"}
        />
        <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>
          {u?.first_name}
          {u?.last_name}
        </Text>
        <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>{u?.email}</Text>
        <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>{u?.college_name}</Text>
        <Text style={{ color: "#626A82", fontSize: 15, lineHeight: 23 }}>{u?.department_name}</Text>
      </Card>
      <Button title="Dashboard" onPress={() => router.back()} />
    </Screen>
  );
}
