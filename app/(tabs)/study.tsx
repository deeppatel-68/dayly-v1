import TopBar from "@/components/common/TopBar";
import AudioSelector from "@/components/study/AudioSelector";
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
        contentContainerStyle={styles.contentContainer}
      >
        <TopBar />
        <FocusTimer onStart={() => setShowStudySpace(true)} />
        <AudioSelector />
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
    paddingBottom: 120, // Space for tab bar
  },
});

