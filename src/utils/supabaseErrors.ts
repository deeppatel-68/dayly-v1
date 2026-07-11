export function isNetworkRequestError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  const name =
    "name" in error && typeof error.name === "string"
      ? error.name.toLowerCase()
      : "";

  return (
    name === "typeerror" &&
    (message.includes("network request failed") ||
      message.includes("failed to fetch") ||
      message.includes("networkerror"))
  );
}

export function logSupabaseError(scope: string, error: unknown) {
  if (isNetworkRequestError(error)) {
    console.warn(`${scope}: Supabase is unreachable. Using local fallback.`);
    return;
  }

  console.error(scope, error);
}
