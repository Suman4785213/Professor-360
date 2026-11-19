import { useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams, router, Redirect, type Href } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "../src/store/session";
import { roles, labels, paths, type Role } from "../src/constants/roles";
import { login } from "../src/services/runtime";
import { errorMessage } from "../src/services/errors";
import {
  Screen,
  Brand,
  Input,
  Button,
  ErrorState,
  Title,
} from "../src/components/ui";
const schema = z.object({
  email: z.email(),
  password: z.string().min(1, "Enter your password"),
});
export default function Login() {
  const { portal } = useLocalSearchParams();
  const college = useSession((s) => s.college);
  const user = useSession((s) => s.user);
  const [institutionRole, setRole] = useState<Role>("FACULTY");
  const role: Role = portal === "super-admin" ? "SUPER_ADMIN" : institutionRole;
  const [error, setError] = useState("");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  if (user) return <Redirect href={paths[user.role] as Href} />;
  if (portal !== "super-admin" && !college)
    return <Redirect href="/institutions" />;
  return (
    <Screen>
      <Brand />
      <Title>{college?.name || "Super Admin"}</Title>
      {portal !== "super-admin" &&
        roles
          .filter((r) => r !== "SUPER_ADMIN")
          .map((r) => (
            <Button
              key={r}
              title={`${role === r ? "Selected: " : ""}${labels[r]}`}
              disabled={isSubmitting}
              onPress={() => setRole(r)}
            />
          ))}
      <Text style={{ color: "#352B88", fontSize: 16, lineHeight: 24, fontWeight: "700", paddingVertical: 8 }}>Sign in as {labels[role]}</Text>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.email && <ErrorState message={errors.email.message!} />}
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Input
            label="Password"
            secureTextEntry
            autoComplete="current-password"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      {errors.password && <ErrorState message={errors.password.message!} />}
      {error && <ErrorState message={error} />}
      <Button
        title={isSubmitting ? "Signing in..." : "Sign in"}
        disabled={isSubmitting}
        onPress={handleSubmit(async (data) => {
          setError("");
          try {
            await login(data.email, data.password, role, college?.id);
            router.replace("/");
          } catch (e) {
            setError(errorMessage(e));
          }
        })}
      />
      <Button
        title="Change institution"
        disabled={isSubmitting}
        onPress={() => router.replace("/institutions")}
      />
    </Screen>
  );
}
