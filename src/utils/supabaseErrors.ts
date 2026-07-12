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

// True when the backend object (RPC/table) doesn't exist yet — e.g. a dev
// project where a migration hasn't been applied. Callers degrade to empty
// data instead of erroring.
export function isMissingBackendObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  // PGRST202: PostgREST unknown function; 42883/42P01/42703: Postgres
  // undefined function / table / column.
  return (
    code === "PGRST202" ||
    code === "42883" ||
    code === "42P01" ||
    code === "42703"
  );
}

export function logSupabaseError(scope: string, error: unknown) {
  if (isNetworkRequestError(error)) {
    console.warn(`${scope}: Supabase is unreachable. Using local fallback.`);
    return;
  }

  console.error(scope, error);
}
