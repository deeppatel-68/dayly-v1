import { useTheme } from "@/context/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

function TopBar() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>dayly</Text>
        <Text style={[styles.logo, { color: colors.textSecondary }]}>LOGO</Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.text }]}>
        Welcome to dayly
      </Text>
    </View>
  );
}

export default TopBar;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "auto",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 48,
    color: "#fff",
    marginLeft: 20,
    marginTop: 10,
  },
  logo: {
    fontFamily: "Outfit-Light",
    fontSize: 20,
    color: "#fff",
    marginRight: 20,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Outfit-Regular",
    alignSelf: "flex-start",
    marginBottom: 10,
    marginLeft: 20,
    opacity: 0.7,
  },
});
