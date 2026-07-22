import { Redirect } from "expo-router";

// Preserve the existing root deep link while the visible Home tab owns a stack.
export default function RootRedirect() {
  return <Redirect href="/home" />;
}
