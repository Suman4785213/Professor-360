import { workflowError } from "./api";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Text, Switch, View } from "react-native";
import { useState } from "react";
import { activitySchema, activityTypes, type Activity } from "./api";
import { session } from "../../services/runtime";
import { normalizeList } from "../dashboards/contracts";
import { Button, Input, ErrorState, Loading } from "../../components/ui";
import { errorMessage } from "../../services/errors";
export function ActivityForm({
  a,
  onSave,
}: {
  a?: Activity;
  onSave: (data: unknown) => Promise<unknown>;
}) {
  const [error, setError] = useState("");
  const defaults = {
    title: "",
    activity_type: "OTHER" as (typeof activityTypes)[number],
    organizer: "",
    venue: "",
    location: "",
    start_date: "",
    end_date: "",
    duration: "",
    duration_days: "",
    duration_hours: "",
    description: "",
    additional_remarks: "",
    certificate_number: "",
    academic_year: "",
    category: "",
    is_online: false,
  };
  if (a)
    for (const k of Object.keys(defaults)) {
      const value = a[k];
      if (value != null)
        (defaults as Record<string, unknown>)[k] =
          k === "is_online" ? value : String(value);
    }
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: defaults,
  });
  const values = useWatch({ control });
  const catalogs = useQuery({
    queryKey: ["activity-catalogs"],
    queryFn: async () => {
      async function all(path: string) {
        const rows: { id?: string; name?: string }[] = [];
        let next: string | null = path;
        while (next) {
          const page = normalizeList((await session.api.get(next)).data);
          rows.push(...page.results);
          next = page.next || null;
        }
        return rows;
      }
      return {
        categories: await all("activity-categories/"),
        years: await all("academic-years/"),
      };
    },
  });
  return (
    <View style={{ gap: 12 }}>
      {Object.keys(defaults)
        .filter(
          (k) =>
            ![
              "category",
              "academic_year",
              "activity_type",
              "is_online",
            ].includes(k),
        )
        .map((name) => (
          <Controller
            key={name}
            control={control}
            name={name as keyof typeof defaults}
            render={({ field }) => (
              <Input
                label={name.replaceAll("_", " ")}
                value={String(field.value)}
                onChangeText={field.onChange}
                editable={!isSubmitting}
              />
            )}
          />
        ))}
      <Text>Activity type</Text>
      {activityTypes.map((t) => (
        <Button
          key={t}
          disabled={isSubmitting}
          title={`${values.activity_type === t ? "Selected: " : ""}${t}`}
          onPress={() => setValue("activity_type", t)}
        />
      ))}
      {catalogs.isPending && <Loading />}
      {catalogs.error && (
        <ErrorState
          message={errorMessage(catalogs.error)}
          retry={() => void catalogs.refetch()}
        />
      )}
      <Text>Category (optional)</Text>
      <Button title="No category" onPress={() => setValue("category", "")} />
      {catalogs.data?.categories.map((c) => (
        <Button
          key={c.id}
          title={`${values.category === c.id ? "Selected: " : ""}${c.name}`}
          onPress={() => setValue("category", c.id!)}
        />
      ))}
      <Text>
        Academic year (optional; server chooses current year for a new draft)
      </Text>
      <Button
        title="No explicit year"
        onPress={() => setValue("academic_year", "")}
      />
      {catalogs.data?.years.map((c) => (
        <Button
          key={c.id}
          title={`${values.academic_year === c.id ? "Selected: " : ""}${c.name}`}
          onPress={() => setValue("academic_year", c.id!)}
        />
      ))}
      <Text>Online activity</Text>
      <Switch
        accessibilityLabel="Online activity"
        value={values.is_online}
        onValueChange={(v) => setValue("is_online", v)}
      />
      {Object.entries(errors).map(([k, e]) => (
        <ErrorState key={k} message={`${k}: ${e.message}`} />
      ))}
      {error && <ErrorState message={error} />}
      <Button
        title={isSubmitting ? "Saving..." : "Save draft / corrections"}
        disabled={isSubmitting}
        onPress={handleSubmit(async (data) => {
          setError("");
          try {
            await onSave(data);
          } catch (e) {
            setError(workflowError(e) || errorMessage(e));
          }
        })}
      />
    </View>
  );
}
