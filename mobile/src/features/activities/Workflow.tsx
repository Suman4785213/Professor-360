import { workflowError } from "./api";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../store/session";
import { session, queryClient } from "../../services/runtime";
import {
  Screen,
  Title,
  Card,
  Button,
  Input,
  Loading,
  ErrorState,
} from "../../components/ui";
import { DownloadButton } from "../../components/PrivateMedia";
import { VerificationStatusBadge as StatusBadge } from "../../components/dashboard";
import {
  workflowApi,
  editable,
  owns,
  stage,
  type Activity,
  type Verification,
} from "./api";
import { ActivityForm } from "./ActivityForm";
import { DocumentPickerField } from "./Upload";
import { errorMessage } from "../../services/errors";
export async function invalidateWorkflow() {
  await Promise.all(
    [
      "dashboard",
      "activity",
      "verification",
      "evidence-files",
      "unread",
      "notifications",
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}
export default function Workflow() {
  const user = useSession((s) => s.user)!;
  const { id, record } = useLocalSearchParams<{
    id?: string;
    record?: string;
  }>();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState<"submit" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const api = useMemo(
    () => workflowApi(session.api, user, invalidateWorkflow),
    [user],
  );
  const activity = useQuery({
    queryKey: ["activity", user.id, id],
    enabled: !!id,
    queryFn: async () =>
      (
        await session.api.get<Activity>(
          `activities/${encodeURIComponent(id!)}/`,
        )
      ).data,
  });
  const recordId = record || activity.data?.verification_details?.id;
  const verification = useQuery({
    queryKey: ["verification", user.id, recordId],
    enabled: !!recordId,
    queryFn: async () =>
      (
        await session.api.get<Verification>(
          `verifications/${encodeURIComponent(recordId!)}/`,
        )
      ).data,
  });
  const a = record ? verification.data?.activity_details : activity.data;
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage("Action recorded. Status refreshed.");
      setConfirm(null);
    } catch (e) {
      setError(
        (workflowError(e) || errorMessage(e)) +
          " Refresh the record before retrying an uncertain or stale action.",
      );
      await invalidateWorkflow();
    } finally {
      setBusy(false);
    }
  }
  if (!id && !record)
    return (
      <Screen>
        <Title>New activity draft</Title>
        {user.role === "FACULTY" && user.college && user.department ? (
          <ActivityForm
            onSave={async (data) => {
              const created = await api.save(data);
              router.setParams({ id: created.id });
            }}
          />
        ) : (
          <ErrorState message="Faculty institution and department assignment required." />
        )}
        <Button title="Back" onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen>
      <Title>Activity review</Title>
      {(record ? verification.isPending : activity.isPending) && <Loading />}
      {(activity.error || verification.error) && (
        <ErrorState
          message={errorMessage(activity.error || verification.error)}
          retry={() => {
            void activity.refetch();
            void verification.refetch();
          }}
        />
      )}
      {a && (
        <>
          <Card>
            <Title>{a.title}</Title>
            <StatusBadge status={a.status} />
            <ReturnReasonDisplay reason={a.last_rejection_reason} />
            {[
              "organizer",
              "venue",
              "location",
              "start_date",
              "end_date",
              "duration",
              "duration_days",
              "duration_hours",
              "description",
              "additional_remarks",
              "certificate_number",
              "category_name",
              "academic_year_name",
            ].map((k) =>
              a[k] != null && a[k] !== "" ? (
                <Text key={k}>
                  {k.replaceAll("_", " ")}: {String(a[k])}
                </Text>
              ) : null,
            )}
          </Card>
          <EvidenceAttachmentList a={a} />
          {editable(user, a) && (
            <>
              <Button
                title={edit ? "Close editor" : "Edit activity"}
                disabled={busy}
                onPress={() => setEdit((x) => !x)}
              />
              {edit && (
                <ActivityForm
                  key={a.updated_at as string}
                  a={a}
                  onSave={async (data) => {
                    await api.save(data, a);
                    setEdit(false);
                  }}
                />
              )}
              <DocumentPickerField
                a={a}
                user={user}
                refresh={invalidateWorkflow}
              />
              <Button
                title="Submit / resubmit for verification"
                disabled={busy}
                onPress={() => setConfirm("submit")}
              />
            </>
          )}
          {owns(user, a) && a.status === "DRAFT" && (
            <Button
              title="Delete draft"
              disabled={busy}
              onPress={() => setConfirm("delete")}
            />
          )}
          {confirm && (
            <SubmissionConfirmation
              action={confirm}
              busy={busy}
              cancel={() => setConfirm(null)}
              confirm={() =>
                void act(async () => {
                  if (confirm === "delete") {
                    await api.remove(a);
                    router.back();
                  } else await api.submit(a);
                })
              }
            />
          )}
          {verification.data && (
            <>
              <VerificationTimeline v={verification.data} />
              {stage(user, verification.data.activity_details) && (
                <VerificationDecisionSheet
                  busy={busy}
                  iqac={user.role === "IQAC"}
                  onDecision={(d, c, t) =>
                    act(() => api.decide(verification.data!, d, c, t))
                  }
                />
              )}
            </>
          )}
          {!!message && <Text role="status">{message}</Text>}
          {!!error && <ErrorState message={error} />}
        </>
      )}
      <Button
        title="Refresh current status"
        onPress={() => void invalidateWorkflow()}
      />
      <Button title="Back" onPress={() => router.back()} />
    </Screen>
  );
}
export function ReturnReasonDisplay({ reason }: { reason?: string }) {
  return reason ? (
    <Card>
      <Text>Returned / rejected: {reason}</Text>
    </Card>
  ) : null;
}
export function EvidenceAttachmentList({ a }: { a: Activity }) {
  return (
    <View style={{ gap: 10 }}>
      <Title>Evidence attachments</Title>
      {!a.documents.length && <Text>No documents uploaded.</Text>}
      {a.documents.map((d) => (
        <Card key={d.id}>
          <Text>{d.original_filename || d.file_name}</Text>
          <Text>
            {d.file_size} bytes - {d.mime_type}
          </Text>
          <DownloadButton url={d.download_url} />
        </Card>
      ))}
    </View>
  );
}
export function VerificationTimeline({ v }: { v: Verification }) {
  return (
    <Card>
      <Title>Verification history</Title>
      {!v.logs.length && <Text>No decisions yet.</Text>}
      {v.logs.map((log) => (
        <View key={log.id}>
          <Text>
            {log.created_at} - {log.actor_name || log.action}
          </Text>
          <Text>
            {log.previous_status} to {log.new_status}
          </Text>
          <Text>{log.comment}</Text>
        </View>
      ))}
    </Card>
  );
}
export function SubmissionConfirmation({
  action,
  busy,
  confirm,
  cancel,
}: {
  action: string;
  busy: boolean;
  confirm: () => void;
  cancel: () => void;
}) {
  return (
    <Card>
      <Text>Confirm {action}?</Text>
      <Button title="Confirm" disabled={busy} onPress={confirm} />
      <Button title="Cancel" disabled={busy} onPress={cancel} />
    </Card>
  );
}
export function VerificationDecisionSheet({
  busy,
  iqac,
  onDecision,
}: {
  busy: boolean;
  iqac: boolean;
  onDecision: (
    d: "APPROVE" | "REJECT",
    c: string,
    t: string,
  ) => Promise<unknown>;
}) {
  const [comment, setComment] = useState("");
  const [target, setTarget] = useState("FACULTY");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  return (
    <Card>
      <Title>Verification decision</Title>
      <Input
        label="Comment / required return reason"
        value={comment}
        onChangeText={setComment}
      />
      {iqac &&
        [
          { value: "FACULTY", label: "Return to faculty" },
          { value: "HOD", label: "Return to in-charge (backend target HOD)" },
          { value: "DEPARTMENT_INCHARGE", label: "IQAC rejection" },
        ].map((t) => (
          <Button
            key={t.value}
            disabled={busy}
            title={`${target === t.value ? "Selected: " : ""}${t.label}`}
            onPress={() => setTarget(t.value)}
          />
        ))}
      <Button
        title="Approve / forward"
        disabled={busy}
        onPress={() => setDecision("APPROVE")}
      />
      <Button
        title="Return / reject"
        disabled={busy || !comment.trim()}
        onPress={() => setDecision("REJECT")}
      />
      {decision && (
        <SubmissionConfirmation
          action={decision}
          busy={busy}
          cancel={() => setDecision(null)}
          confirm={() => {
            void onDecision(decision, comment, target).finally(() =>
              setDecision(null),
            );
          }}
        />
      )}
    </Card>
  );
}
