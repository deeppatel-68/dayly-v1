import ProgressDisplay from "@/components/ProgressDisplay";
import Ring from "@/components/Ring";
import ShortcutButton from "@/components/ShortcutButtons";
import TopBar from "@/components/TopBar";
import { useTheme } from "@/context/ThemeContext";
import { ScrollView, StyleSheet, View } from "react-native";
export default function Index() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TopBar />
        <View style={styles.ringContainer}>
          <Ring percentage={33} completed={1} total={3} />
        </View>
        {/* <View>
        <RoundStat />
      </View> */}
        <View>
          <ShortcutButton />
        </View>
        <ProgressDisplay />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "black",
  },
  ringContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
});
