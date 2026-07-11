import TopBar from "@/components/common/TopBar";
import FocusTimer from "@/components/study/FocusTimer";
import SessionTasks from "@/components/study/SessionTasks";
import StudySpacePlaceholder from "@/components/study/StudySpacePlaceholder";
import { useTheme } from "@/context/ThemeContext";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export default function StudyScreen() {
  const { colors } = useTheme();
  const [showStudySpace, setShowStudySpace] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.contentContainer}
      >
        <TopBar
          eyebrow="Deep work"
          title="Focus"
          subtitle="Time spent here becomes progress your companion can wear."
        />
        {!showStudySpace && (
          <FocusTimer onStart={() => setShowStudySpace(true)} />
        )}
        <SessionTasks />
      </ScrollView>
      <StudySpacePlaceholder
        visible={showStudySpace}
        onClose={() => setShowStudySpace(false)}
        showTimer={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
});
