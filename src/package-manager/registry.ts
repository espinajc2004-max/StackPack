import { execa } from "execa";

const cache = new Map<string, string | null>();

/**
 * Resolves the exact version a spec (e.g. "latest" or "^5") would install
 * right now, via the npm registry. Returns null when offline or unknown so
 * callers can fall back to showing the spec.
 */
export async function resolveRegistryVersion(name: string, spec: string): Promise<string | null> {
  const key = `${name}@${spec}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let version: string | null = null;
  try {
    const result = await execa("npm", ["view", key, "version", "--json"], {
      timeout: 15_000,
      reject: false,
    });
    const parsed: unknown = JSON.parse(typeof result.stdout === "string" ? result.stdout : "null");
    if (typeof parsed === "string") version = parsed;
    else if (Array.isArray(parsed)) {
      const last: unknown = parsed[parsed.length - 1];
      if (typeof last === "string") version = last;
    }
  } catch {
    version = null;
  }
  cache.set(key, version);
  return version;
}

/** Resolves many specs in parallel; entries that fail are simply absent. */
export async function resolveRegistryVersions(
  entries: Array<{ name: string; version: string }>,
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  await Promise.all(
    entries.map(async ({ name, version }) => {
      const exact = await resolveRegistryVersion(name, version);
      if (exact !== null) resolved.set(name, exact);
    }),
  );
  return resolved;
}
