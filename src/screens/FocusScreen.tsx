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
          <Text selectable style={[styles.message, { color: colors.text }]}>
            Protect one block of time.
          </Text>
          <Text selectable style={[styles.detail, { color: colors.textSecondary }]}>
            Every completed minute becomes progress your companion can wear.
          </Text>
        </View>
        {!showStudySpace ? <FocusTimer onStart={() => setShowStudySpace(true)} /> : null}
        <StudioSection title="Session intention">
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
  content: { paddingBottom: Spacing.xxl, gap: Spacing.lg },
  intro: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  message: { ...StudioType.title },
  detail: { ...StudioType.body },
});
