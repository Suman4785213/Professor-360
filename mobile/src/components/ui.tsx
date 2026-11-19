import type { PropsWithChildren, ReactElement } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";
export function Screen({
  children,
  refreshControl,
}: PropsWithChildren<{ refreshControl?: ReactElement }>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={refreshControl}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 20, flexGrow: 1, width: "100%", maxWidth: 720, alignSelf: "center" }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Brand() {
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 20, backgroundColor: "#FFFFFF", borderRadius: 28, borderWidth: 1, borderColor: colors.border }}>
      <Image
        accessibilityLabel="Professor360 logo"
        source={require("../assets/professor360_logo.png")}
        style={{ width: 88, height: 88 }}
        resizeMode="contain"
      />
      <Text style={styles.title}>Professor360</Text>
    </View>
  );
}
export function Title({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function Card({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        backgroundColor: "white",
        padding: 18,
        borderRadius: 22,
        gap: 14,
        shadowColor: "#24204F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.045,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: colors.primary,
        paddingVertical: 15,
        paddingHorizontal: 18,
        minHeight: 52,
        justifyContent: "center",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#6156D3",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", fontSize: 15, lineHeight: 22, letterSpacing: 0.15, textAlign: "center" }}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Input({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700", letterSpacing: 0.3 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        {...props}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 15,
          minHeight: 54,
          color: colors.ink,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: "white",
          fontSize: 16,
        }}
      />
    </View>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 16, backgroundColor: "#FFF1F4", borderWidth: 1, borderColor: "#F3D7DF" }}>
      <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 14, lineHeight: 21 }}>
        {message}
      </Text>
      {retry && <Button title="Try again" onPress={retry} />}
    </View>
  );
}
export function Loading() {
  return (
    <ActivityIndicator
      accessibilityLabel="Loading"
      size="large"
      style={{ marginVertical: 24, alignSelf: "center" }}
      color={colors.primary}
    />
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 31, fontWeight: "800", letterSpacing: -0.5, color: colors.ink },
});
