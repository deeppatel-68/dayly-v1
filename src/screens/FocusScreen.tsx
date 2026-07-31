import FocusTimer from "@/components/study/FocusTimer";
import SessionTasks from "@/components/study/SessionTasks";
import StudySpacePlaceholder from "@/components/study/StudySpacePlaceholder";
import { StudioSection } from "@/components/ui/StudioPrimitives";
import { Spacing } from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function FocusScreen() {
  const { colors } = useTheme();
  const [showStudySpace, setShowStudySpace] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text selectable style={[styles.eyebrow, { color: colors.accentLight }]}>
            Deep work
          </Text>
          <Text selectable style={[styles.message, { color: colors.text }]}>
            Make a room for one good hour.
          </Text>
          <Text selectable style={[styles.detail, { color: colors.textSecondary }]}>
            Every finished minute becomes progress that Deep can carry with you.
          </Text>
        </View>
        {!showStudySpace ? (
          <View
            style={[
              styles.focusStage,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <FocusTimer onStart={() => setShowStudySpace(true)} />
          </View>
        ) : null}
        <StudioSection title="A small intention">
          <SessionTasks />
        </StudioSection>
      </ScrollView>
      <StudySpacePlaceholder
        visible={showStudySpace}
        onClose={() => setShowStudySpace(false)}
        showTimer
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  intro: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  eyebrow: {
    ...StudioType.section,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  message: { ...StudioType.display },
  detail: { ...StudioType.body },
  focusStage: {
    marginHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
