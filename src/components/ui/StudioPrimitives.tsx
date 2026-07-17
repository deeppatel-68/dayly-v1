import { BorderRadius, Spacing, TouchTarget } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

type StudioSectionProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function StudioSection({
  title,
  action,
  children,
  style,
}: StudioSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text selectable style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function StudioGroup({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type StudioRowProps = {
  title: string;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
  accessibilityLabel?: string;
};

export function StudioRow({
  title,
  detail,
  leading,
  trailing,
  onPress,
  destructive = false,
  last = false,
  accessibilityLabel,
}: StudioRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading ? <View style={styles.rowLeading}>{leading}</View> : null}
      <View style={styles.rowCopy}>
        <Text
          selectable
          numberOfLines={1}
          style={[styles.rowTitle, { color: destructive ? colors.error : colors.text }]}
        >
          {title}
        </Text>
        {detail ? (
          <Text selectable numberOfLines={2} style={[styles.rowDetail, { color: colors.textSecondary }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
    </>
  );

  const rowStyle = [
    styles.row,
    !last && { borderBottomColor: colors.separator, borderBottomWidth: StyleSheet.hairlineWidth },
  ];

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors.surfaceSelected }]}
    >
      {content}
    </Pressable>
  );
}

type StudioButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function StudioButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  tone = "primary",
  style,
  textStyle,
}: StudioButtonProps) {
  const { colors } = useTheme();
  const primary = tone === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.accent : colors.surfaceRaised,
          borderColor: primary ? colors.accent : colors.border,
          opacity: disabled || loading ? 0.5 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onAccent : colors.text} />
      ) : (
        <>
          {icon ? (
            <Ionicons name={icon} size={18} color={primary ? colors.onAccent : colors.text} />
          ) : null}
          <Text style={[styles.buttonLabel, { color: primary ? colors.onAccent : colors.text }, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function StudioIconButton({
  icon,
  label,
  onPress,
  tone = "secondary",
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const primary = tone === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: primary ? colors.accent : colors.surfaceRaised,
          borderColor: primary ? colors.accent : colors.border,
          opacity: pressed ? 0.74 : 1,
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={primary ? colors.onAccent : colors.text}
      />
    </Pressable>
  );
}

export function StudioSheet({
  visible,
  title,
  detail,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  detail?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
          <View style={styles.sheetHeading}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            {detail ? (
              <Text style={[styles.sheetDetail, { color: colors.textSecondary }]}>
                {detail}
              </Text>
            ) : null}
          </View>
          <StudioIconButton icon="close" label="Close" onPress={onClose} />
        </View>
        <View style={styles.sheetContent}>{children}</View>
        {footer ? (
          <View style={[styles.sheetFooter, { borderTopColor: colors.separator }]}>
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export function StudioEmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <Text selectable style={[styles.emptyTitle, { color: colors.text }]}>
        {title}
      </Text>
      <Text selectable style={[styles.emptyDetail, { color: colors.textSecondary }]}>
        {detail}
      </Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionHeader: {
    minHeight: 24,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  sectionTitle: {
    ...StudioType.section,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  group: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    minHeight: TouchTarget + 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rowLeading: { minWidth: TouchTarget, alignItems: "center" },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { ...StudioType.body },
  rowDetail: { ...StudioType.detail },
  rowTrailing: { minHeight: TouchTarget, justifyContent: "center", alignItems: "flex-end" },
  button: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  buttonLabel: { ...StudioType.bodyStrong },
  iconButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: { ...StudioType.title, textAlign: "center" },
  emptyDetail: { ...StudioType.body, textAlign: "center", marginTop: Spacing.xs },
  emptyAction: { width: "100%", marginTop: Spacing.lg },
  sheet: { flex: 1 },
  sheetHeader: {
    minHeight: 68,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sheetHeading: { flex: 1, gap: 2 },
  sheetTitle: { ...StudioType.title },
  sheetDetail: { ...StudioType.detail },
  sheetContent: { flex: 1, padding: Spacing.md },
  sheetFooter: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
