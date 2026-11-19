import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { session, queryClient } from "../../services/runtime";
import { useSession } from "../../store/session";
import { paths } from "../../constants/roles";
import {
  Screen,
  Title,
  Input,
  Button,
  Card,
  ErrorState,
  Loading,
} from "../../components/ui";
import { DownloadButton } from "../../components/PrivateMedia";
import Merge from "../dashboards/Merge";
import {PullToRefresh} from "../../components/dashboard";
import { operationApi, reportActions, taskActions } from "./api";
import { RemoteList, ServerData, type RecordData } from "./common";
import { workflowError } from "../activities/api";
import { errorMessage } from "../../services/errors";
export default function Operations() {
  const u = useSession((s) => s.user)!;
  const { view = "reports", id } = useLocalSearchParams<{
    view?: string;
    id?: string;
  }>();
  const [refreshing,setRefreshing]=useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [result, setResult] = useState<unknown>();
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [type, setType] = useState("");
  const [format, setFormat] = useState("PDF");
  const [owner, setOwner] = useState(u.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState("");
  const [criterion, setCriterion] = useState("");
  const [metric, setMetric] = useState("");
  const [template, setTemplate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const invalidate = async () => {
    await Promise.all(
      ["operations", "dashboard", "notifications", "unread"].map((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      ),
    );
  };
  const api = useMemo(
    () =>
      operationApi(session.api, u, async () => {
        await Promise.all(
          ["operations", "dashboard", "notifications", "unread"].map((k) =>
            queryClient.invalidateQueries({ queryKey: [k] }),
          ),
        );
      }),
    [u],
  );
  function open(next: string, row?: RecordData) {
    router.push({
      pathname: `${paths[u.role]}/operations`,
      params: { view: next, ...(row?.id ? { id: row.id } : {}) },
    });
  }
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await fn();
      setResult(data);
      setSuccess("Server action completed.");
    } catch (e) {
      setError(workflowError(e) || errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const detail = useQuery({
    queryKey: ["operations", u.id, view, id],
    enabled: !!id && ["reports", "tasks", "notifications"].includes(view),
    queryFn: async ({ signal }) =>
      (await session.api.get(`${view}/${encodeURIComponent(id!)}/`, { signal }))
        .data,
  });
  const known = [
    "reports",
    "generate",
    "faculty-reports",
    "requests",
    "merge",
    "tasks",
    "all-tasks",
    "task-create",
    "accreditation",
    "aqar",
    "ssr",
    "criteria",
    "metrics",
    "evidence-requirements",
    "evidence-mappings",
    "metric-evidence",
  ];
  const taskBody = {
    title,
    description,
    owner,
    priority,
    due_date: due || null,
  };
  const reportBody = {
    report_type: type,
    ...(year ? { academic_year: year } : {}),
    ...(department ? { department } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    output_format: format,
    ...(criterion ? { criterion } : {}),
    ...(metric ? { metric } : {}),
    ...(template ? { template } : {}),
  };
  return (
    <Screen refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void invalidate().finally(()=>setRefreshing(false))}}/>}>
      <Title>{view.replaceAll("-", " ")}</Title>
      {!known.includes(view) ||
      (!u.college &&
        (u.role !== "SUPER_ADMIN" ||
          [
            "accreditation",
            "aqar",
            "ssr",
            "criteria",
            "metrics",
            "evidence-requirements",
            "evidence-mappings",
            "metric-evidence",
          ].includes(view))) ? (
        <ErrorState message="Institution assignment required." />
      ) : (
        <>
          {view === "reports" && !id && (
            <>
              <Text>
                Title/status filters apply to loaded pages; use Load more to
                inspect further history.
              </Text>
              {["", "GENERATING", "COMPLETED", "FAILED"].map((s) => (
                <Button
                  key={s}
                  title={s || "All statuses"}
                  onPress={() => setStatus(s)}
                />
              ))}
              <Input
                label="Search title"
                value={search}
                onChangeText={setSearch}
              />
              <RemoteList
                path="academic-years/"
                onOpen={(row) => setYear(row.id!)}
              />
              <Text>Academic year: {year || "All"}</Text>
              <Button title="Clear year" onPress={() => setYear("")} />
              {["IQAC", "COLLEGE_MANAGEMENT", "SUPER_ADMIN"].includes(
                u.role,
              ) && (
                <RemoteList
                  path="departments/"
                  onOpen={(row) => setDepartment(row.id!)}
                />
              )}
              <Button
                title="Generate / preview report"
                onPress={() => open("generate")}
              />
              {u.role === "DEPARTMENT_INCHARGE" && (
                <>
                  <Button
                    title="Faculty report requests and generation"
                    onPress={() => open("faculty-reports")}
                  />
                  <Button title="Merge reports" onPress={() => open("merge")} />
                  <Button
                    title="Request statuses"
                    onPress={() => open("requests")}
                  />
                </>
              )}
              {["IQAC", "COLLEGE_MANAGEMENT"].includes(u.role) && (
                <Button
                  title="Accreditation workspace"
                  onPress={() => open("accreditation")}
                />
              )}
              <RemoteList
                path={
                  u.role === "HOD"
                    ? "reports/hod-downloaded-reports/"
                    : u.role === "DEPARTMENT_INCHARGE"
                      ? "reports/incharge-stored-reports/"
                      : `reports/?${new URLSearchParams({ ...(year ? { academic_year: year } : {}), ...(department ? { department } : {}) })}`
                }
                filter={(r) =>
                  String(r.title || "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) &&
                  (!status ||
                    r.status === status ||
                    (!r.status && status === "COMPLETED"))
                }
                onOpen={(r) => open("reports", r)}
              />
            </>
          )}
          {view === "reports" && id && (
            <>
              {detail.isPending && <Loading />}
              {detail.data && (
                <>
                  <ServerData data={detail.data} />
                  {detail.data.download_url && (
                    <DownloadButton url={detail.data.download_url} />
                  )}
                  {reportActions(u.role).map((action) => (
                    <Button
                      key={action}
                      title={action.replaceAll("-", " ")}
                      disabled={busy || detail.data.status !== "COMPLETED"}
                      onPress={() => void act(() => api.handoff(id, action))}
                    />
                  ))}
                  {["HOD", "DEPARTMENT_INCHARGE"].includes(u.role) && (
                    <Text>
                      Handoff history is shown in the received/stored report
                      list. Repeated handoffs are protected by the backend.
                    </Text>
                  )}
                </>
              )}
            </>
          )}
          {view === "generate" && (
            <>
              <RemoteList path="report-types/" onOpen={(r) => setType(r.id!)} />
              <RemoteList
                path="report-templates/"
                onOpen={(r) => setTemplate(r.id!)}
              />
              <Text>Template: {template || "Default"}</Text>
              <Button
                title="Default template"
                onPress={() => setTemplate("")}
              />
              <RemoteList
                path="criteria/"
                onOpen={(r) => setCriterion(r.id!)}
              />
              <Text>Criterion: {criterion || "All"}</Text>
              <RemoteList path="metrics/" onOpen={(r) => setMetric(r.id!)} />
              <Text>Metric: {metric || "All"}</Text>
              <Text>Selected report type: {type || "Select above"}</Text>
              <RemoteList
                path="academic-years/"
                onOpen={(r) => setYear(r.id!)}
              />
              <Text>Year: {year || "All authorized years"}</Text>
              <Input
                label="Reporting period from YYYY-MM-DD (optional)"
                value={dateFrom}
                onChangeText={setDateFrom}
              />
              <Input
                label="Reporting period to YYYY-MM-DD (optional)"
                value={dateTo}
                onChangeText={setDateTo}
              />
              {["PDF", "EXCEL", "WORD"].map((f) => (
                <Button
                  key={f}
                  title={`${format === f ? "Selected: " : ""}${f}`}
                  onPress={() => setFormat(f)}
                />
              ))}
              <Button
                title="Preview authorized report data"
                disabled={busy || !type}
                onPress={() => void act(() => api.preview(reportBody))}
              />
              <Button
                title="Generate on server"
                disabled={busy || !type}
                onPress={() => void act(() => api.generate(reportBody))}
              />
            </>
          )}
          {view === "faculty-reports" && u.role === "DEPARTMENT_INCHARGE" && (
            <>
              <Input
                label="Request message / reporting period"
                value={comment}
                onChangeText={setComment}
              />
              <RemoteList
                path="auth/users/?role=FACULTY"
                onOpen={(r) => setOwner(r.id!)}
              />
              <Text>
                Selected faculty:{" "}
                {owner === u.id ? "Select faculty above" : owner}
              </Text>
              <Button
                title="Send report request"
                disabled={busy || owner === u.id}
                onPress={() => void act(() => api.request(owner, comment))}
              />
              <Button
                title="Generate faculty report"
                disabled={busy || owner === u.id}
                onPress={() => void act(() => api.facultyReport(owner))}
              />
            </>
          )}
          {view === "requests" && (
            <RemoteList path="notifications/incharge-requests/" />
          )}
          {view === "merge" && u.role === "DEPARTMENT_INCHARGE" && <Merge />}
          {view === "tasks" && !id && (
            <>
              <Button
                title="Create task"
                disabled={u.role === "COLLEGE_MANAGEMENT"}
                onPress={() => open("task-create")}
              />
              <RemoteList
                path={`tasks/?owner=${encodeURIComponent(u.id)}`}
                onOpen={(r) => open("tasks", r)}
              />
              <Button
                title="All authorized tasks"
                onPress={() => open("all-tasks")}
              />
            </>
          )}
          {view === "all-tasks" && (
            <RemoteList path="tasks/" onOpen={(r) => open("tasks", r)} />
          )}
          {view === "task-create" && u.role !== "COLLEGE_MANAGEMENT" && (
            <>
              <TaskFields
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                due={due}
                setDue={setDue}
              />
              {u.role !== "FACULTY" && (
                <RemoteList
                  path="auth/users/"
                  onOpen={(r) => setOwner(r.id!)}
                />
              )}
              <Text>Owner: {owner}</Text>
              {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                <Button
                  key={p}
                  title={`${priority === p ? "Selected: " : ""}${p}`}
                  onPress={() => setPriority(p)}
                />
              ))}
              <Button
                title="Create task"
                disabled={busy || !title.trim()}
                onPress={() => void act(() => api.saveTask(taskBody))}
              />
            </>
          )}
          {view === "tasks" && id && detail.data && (
            <>
              <ServerData data={detail.data} />
              {u.role !== "COLLEGE_MANAGEMENT" && (
                <>
                  <Input
                    label="Task title update (optional)"
                    value={title}
                    onChangeText={setTitle}
                  />
                  <Input
                    label="Updated description (optional)"
                    value={description}
                    onChangeText={setDescription}
                  />
                  <Input
                    label="Updated due date YYYY-MM-DD (optional)"
                    value={due}
                    onChangeText={setDue}
                  />
                  {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                    <Button
                      key={p}
                      title={`Set priority ${p}`}
                      disabled={busy}
                      onPress={() =>
                        void act(() => api.saveTask({ priority: p }, id))
                      }
                    />
                  ))}
                  <Button
                    title="Update entered task fields"
                    disabled={busy || (!title.trim() && !description && !due)}
                    onPress={() =>
                      void act(() =>
                        api.saveTask(
                          {
                            ...(title ? { title } : {}),
                            ...(description ? { description } : {}),
                            ...(due ? { due_date: due } : {}),
                          },
                          id,
                        ),
                      )
                    }
                  />
                  <Input
                    label="Comment"
                    value={comment}
                    onChangeText={setComment}
                  />
                  {taskActions.map((a) => (
                    <Button
                      key={a}
                      title={a}
                      disabled={busy}
                      onPress={() => void act(() => api.task(id, a, comment))}
                    />
                  ))}
                  <Button
                    title="Add comment"
                    disabled={busy || !comment.trim()}
                    onPress={() => void act(() => api.comment(id, comment))}
                  />
                </>
              )}
              <RemoteList path={`tasks/${id}/comments/`} />
              <RemoteList path={`tasks/${id}/activities/`} />
            </>
          )}
          {view === "accreditation" && (
            <>
              {[
                "aqar",
                "ssr",
                "criteria",
                "metrics",
                "evidence-requirements",
                "evidence-mappings",
              ].map((v) => (
                <Button
                  key={v}
                  title={v.toUpperCase()}
                  onPress={() => open(v)}
                />
              ))}
            </>
          )}
          {[
            "aqar",
            "ssr",
            "criteria",
            "metrics",
            "evidence-requirements",
            "evidence-mappings",
            "metric-evidence",
          ].includes(view) && (
            <>
              <RemoteList
                path={
                  view === "aqar"
                    ? "aqar/dashboard/"
                    : view === "ssr"
                      ? "ssr/dashboard/"
                      : view === "metric-evidence"
                        ? `metrics/${id}/evidence/`
                        : `${view}/${id ? `${id}/` : ""}`
                }
                onOpen={
                  view === "metrics"
                    ? (r) => open("metric-evidence", r)
                    : view === "criteria"
                      ? (r) => open("criteria", r)
                      : undefined
                }
              />
              {view === "metric-evidence" && (
                <>
                  <RemoteList path={`metrics/${id}/`} />
                  <Title>Evidence requirements</Title>
                  <RemoteList
                    path={`evidence-requirements/?metric=${encodeURIComponent(id!)}`}
                  />
                </>
              )}
            </>
          )}
          {!!detail.error && (
            <ErrorState
              message={errorMessage(detail.error)}
              retry={() => void detail.refetch()}
            />
          )}
          {!!error && <ErrorState message={error} />}
          {!!success && <Text>{success}</Text>}
          {result != null && (
            <Card>
              <ServerData data={result} />
              {typeof result === "object" &&
                result &&
                "download_url" in result &&
                typeof result.download_url === "string" && (
                  <DownloadButton url={result.download_url} />
                )}
              {typeof result === "object" &&
                result &&
                "file_url" in result &&
                typeof result.file_url === "string" && (
                  <DownloadButton url={result.file_url} />
                )}
            </Card>
          )}
        </>
      )}
      <Button title="Refresh workspace" onPress={() => void invalidate()} />
      <Button title="Back" onPress={() => router.back()} />
    </Screen>
  );
}
function TaskFields({
  title,
  setTitle,
  description,
  setDescription,
  due,
  setDue,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  due: string;
  setDue: (v: string) => void;
}) {
  return (
    <View>
      <Input label="Task title" value={title} onChangeText={setTitle} />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
      />
      <Input label="Due date YYYY-MM-DD" value={due} onChangeText={setDue} />
    </View>
  );
}
