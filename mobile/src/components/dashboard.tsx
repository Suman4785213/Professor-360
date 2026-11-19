import { EvidenceFiles } from "./EvidenceFiles";
import { DownloadButton, PrivateAvatar } from "./PrivateMedia";
import type { PropsWithChildren } from "react";
import { Text, View, RefreshControl } from "react-native";
import { Brand, Title, Card, Button, Loading, ErrorState } from "./ui";
import { labels } from "../constants/roles";
import type { User } from "../types";
import type { Row } from "../features/dashboards/contracts";
export { ErrorState };
export const LoadingState = Loading;
export function EmptyState() {
  return <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22, padding: 20, textAlign: "center", backgroundColor: "#F5F4FB", borderRadius: 16 }}>No records returned.</Text>;
}
export function DashboardHeader({ user }: { user: User }) {
  return (
    <>
      <Brand />
      <Title>{labels[user.role]}</Title>
    </>
  );
}
export function WelcomeCard({ user }: { user: User }) {
  return (
    <Card>
      <Text style={{ color: "#192443", fontSize: 20, lineHeight: 28, fontWeight: "700" }}>
        Welcome, {user.first_name}
        {user.last_name}
      </Text>
      <Text style={{ color: "#4B3FC4", fontSize: 15, lineHeight: 23, fontWeight: "600" }}>{user.college_name || "Platform administration"}</Text>
      {!!user.department_name && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 21 }}>{user.department_name}</Text>}
    </Card>
  );
}
export function StatisticCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View
      style={{
        minWidth: 112,
        flexBasis: "44%",
        flexShrink: 1,
        flexGrow: 1,
        padding: 16,
        gap: 8,
        backgroundColor: "#F0EDFC",
        borderWidth: 1,
        borderColor: "#E4DEF7",
        borderRadius: 18,
      }}
    >
      <Text style={{ fontSize: 30, lineHeight: 38, fontWeight: "800", color: "#352B88", letterSpacing: -0.7 }}>{value}</Text>
      <Text style={{ color: "#555171", fontSize: 13, lineHeight: 20, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
export function QuickActionGrid({
  actions,
}: {
  actions: { title: string; onPress: () => void }[];
}) {
  return (
    <View style={{ gap: 10, padding: 12, borderRadius: 22, backgroundColor: "#ECE9F8", borderWidth: 1, borderColor: "#E2DDF3" }}>
      {actions.map((a) => (
        <Button key={a.title} {...a} />
      ))}
    </View>
  );
}
export function ActivitySummary({ children }: PropsWithChildren) {
  return <View style={{ gap: 8 }}>{children}</View>;
}
export function VerificationStatusBadge({ status }: { status: string }) {
  return (
    <Text
      accessibilityLabel={`Status ${status}`}
      style={{ color: "#4835A3", fontWeight: "700", fontSize: 12, lineHeight: 19, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#F0EBFF", borderRadius: 10, alignSelf: "flex-start", flexShrink: 1 }}
    >
      {status.replaceAll("_", " ")}
    </Text>
  );
}
export function RecordCard({ row }: { row: Row }) {
  return (
    <Card>
      <Text style={{ fontWeight: "700", color: "#192443", fontSize: 16, lineHeight: 24 }}>
        {row.title ||
          row.activity_details?.title ||
          row.user_name ||
          row.name ||
          row.faculty_name ||
          row.id}
      </Text>
      {row.document_details && row.id && <EvidenceFiles id={row.id} />}
      {!!row.code && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>{row.code}</Text>}
      {!!row.designation && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>{row.designation}</Text>}
      {!!row.department_name && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>{row.department_name}</Text>}
      {!!row.body && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>{row.body}</Text>}
      {!!row.plan_details && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>{row.plan_details.name}</Text>}
      {row.faculty_count !== undefined && (
        <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>Faculty: {row.faculty_count}</Text>
      )}
      {row.total_fdps !== undefined && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>FDP: {row.total_fdps}</Text>}
      {row.total_publications !== undefined && (
        <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>Publications: {row.total_publications}</Text>
      )}
      {!!row.current_status && (
        <VerificationStatusBadge status={row.current_status} />
      )}
      {!!row.status && <VerificationStatusBadge status={row.status} />}
      {!!row.response && <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>Faculty response: {row.response}</Text>}
      {row.submitted_to_hod !== undefined && (
        <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>Submitted to HOD: {row.submitted_to_hod ? "Yes" : "No"}</Text>
      )}
      {row.submitted_to_admins !== undefined && (
        <Text style={{ color: "#626A82", fontSize: 14, lineHeight: 22 }}>
          Submitted to Management/IQAC: {row.submitted_to_admins ? "Yes" : "No"}
        </Text>
      )}
      {!!(row.download_url || row.file_url) && (
        <DownloadButton url={(row.download_url || row.file_url)!} />
      )}
      {row.document_details?.download_url && (
        <DownloadButton url={row.document_details.download_url} />
      )}
      {row.documents?.map((d) =>
        d.download_url ? (
          <DownloadButton key={d.id} url={d.download_url} />
        ) : null,
      )}
      {row.profile_photo && (
        <PrivateAvatar
          url={row.profile_photo}
          name={row.user_name || "Faculty"}
        />
      )}
    </Card>
  );
}
export const DepartmentCard = RecordCard;
export const FacultyCard = RecordCard;
export const ReportCard = RecordCard;
export const NotificationPreview = RecordCard;
export const TaskSummary = RecordCard;
// Android ScrollView clones this element with its content and layout props.
// Keep the native component identity so those injected props are preserved.
export const PullToRefresh = RefreshControl;
