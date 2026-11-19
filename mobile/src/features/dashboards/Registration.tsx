import { useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../store/session";
import { session, queryClient } from "../../services/runtime";
import { Input, Button, Loading, ErrorState, Card } from "../../components/ui";
import { canRegister, registerFaculty, registrationSchema } from "./actions";
import { normalizeList } from "./contracts";
import { errorMessage } from "../../services/errors";
export default function Registration() {
  const u = useSession((s) => s.user)!;
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    department: "",
    employee_id: "",
    designation: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const departments = useQuery({
    queryKey: ["registration-departments", u.id, u.college],
    enabled: canRegister(u),
    queryFn: async () => {
      const rows: { id: string; name?: string }[] = [];
      let next: string | null = "departments/";
      while (next) {
        const data = normalizeList((await session.api.get(next)).data);
        rows.push(
          ...data.results.filter((x): x is typeof x & { id: string } => !!x.id),
        );
        next = data.next || null;
      }
      return rows;
    },
  });
  if (!canRegister(u))
    return <ErrorState message="Faculty registration is not permitted." />;
  return (
    <Card>
      <Text>Register faculty in your institution</Text>
      {Object.keys(form)
        .filter((k) => k !== "department")
        .map((key) => (
          <Input
            key={key}
            label={key.replaceAll("_", " ")}
            value={form[key as keyof typeof form]}
            secureTextEntry={key.includes("password")}
            autoCapitalize="none"
            onChangeText={(v) => setForm({ ...form, [key]: v })}
          />
        ))}
      {departments.isPending && <Loading />}
      {departments.error && (
        <ErrorState
          message={errorMessage(departments.error)}
          retry={() => void departments.refetch()}
        />
      )}
      {departments.data?.length === 0 && <Text>No departments available.</Text>}
      {departments.data?.map((d) => (
        <Button
          key={d.id}
          disabled={busy}
          title={`${form.department === d.id ? "Selected: " : ""}${d.name}`}
          onPress={() => setForm({ ...form, department: d.id })}
        />
      ))}
      {error && <ErrorState message={error} />}
      {message && <Text>{message}</Text>}
      <Button
        title={busy ? "Registering..." : "Register faculty"}
        disabled={busy || !departments.data}
        onPress={() => {
          const parsed = registrationSchema.safeParse(form);
          if (!parsed.success) {
            setError(
              parsed.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("\n"),
            );
            return;
          }
          setBusy(true);
          setError("");
          setMessage("");
          void registerFaculty(session.api, u, form, departments.data!)
            .then((r) => {
              setMessage(r.message || "Faculty registered.");
              setForm({
                ...form,
                password: "",
                confirm_password: "",
                email: "",
              });
              void queryClient.invalidateQueries({
                queryKey: ["dashboard", u.id],
              });
            })
            .catch((e) => {
              const data = e.response?.data;
              setError(
                data?.error?.details || data?.details
                  ? JSON.stringify(data.error?.details || data.details)
                  : errorMessage(e),
              );
            })
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
