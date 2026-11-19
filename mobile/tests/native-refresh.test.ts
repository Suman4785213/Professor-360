import { expect, it, vi } from "vitest";
import { RefreshControl } from "react-native";
import { PullToRefresh } from "../src/components/dashboard";

vi.mock("react-native", () => ({
  RefreshControl: function NativeRefreshControl() { return null; },
  Text: "Text",
  View: "View",
}));
vi.mock("../src/components/EvidenceFiles", () => ({ EvidenceFiles: "EvidenceFiles" }));
vi.mock("../src/components/PrivateMedia", () => ({
  DownloadButton: "DownloadButton", PrivateAvatar: "PrivateAvatar",
}));
vi.mock("../src/components/ui", () => ({
  Brand: "Brand", Title: "Title", Card: "Card", Button: "Button",
  Loading: "Loading", ErrorState: "ErrorState",
}));

it("uses the native refresh component so Android ScrollView can inject its content and layout", () => {
  // A wrapper accepting only refreshing/onRefresh discarded Android's cloned
  // children and style, leaving every dashboard blank on the actual emulator.
  expect(PullToRefresh).toBe(RefreshControl);
});
