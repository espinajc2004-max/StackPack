import fs from "node:fs";
import path from "node:path";
import { cacheDir, ensureDirs } from "../storage/paths.js";
import { isDistTag, isExactVersion } from "../utils/package-parser.js";

const REGISTRY_URL = "https://registry.npmjs.org";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type PackageStatus = "found" | "missing" | "unreachable";
export type VersionStatus = "found" | "missing" | "unreachable" | "unchecked";

interface CacheEntry {
  status: "found" | "missing";
  fetchedAt: number;
}

type RegistryCache = Record<string, CacheEntry>;

function cacheFile(): string {
  return path.join(cacheDir(), "registry-cache.json");
}

function readCache(): RegistryCache {
  try {
    return JSON.parse(fs.readFileSync(cacheFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeCache(cache: RegistryCache): void {
  try {
    ensureDirs();
    fs.writeFileSync(cacheFile(), JSON.stringify(cache), "utf8");
  } catch {
    // caching is best-effort
  }
}

function encodePackage(name: string): string {
  return name.replace("/", "%2F");
}

export async function verifyPackage(name: string): Promise<PackageStatus> {
  const cache = readCache();
  const entry = cache[name];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.status;

  try {
    const res = await fetch(`${REGISTRY_URL}/${encodePackage(name)}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 404) {
      const status = res.ok ? "found" : "missing";
      cache[name] = { status, fetchedAt: Date.now() };
      writeCache(cache);
      return status;
    }
    return "unreachable";
  } catch {
    return "unreachable";
  }
}

/**
 * Verifies an exact version or dist-tag against the registry.
 * Ranges and partial versions (e.g. "^18", "5") are accepted without a
 * network check and reported as "unchecked".
 */
export async function verifyVersion(
  name: string,
  version: string
): Promise<VersionStatus> {
  if (version === "latest") return "found";
  if (!isExactVersion(version) && !isDistTag(version)) return "unchecked";
  try {
    const res = await fetch(
      `${REGISTRY_URL}/${encodePackage(name)}/${encodeURIComponent(version)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) return "found";
    if (res.status === 404) return "missing";
    return "unreachable";
  } catch {
    return "unreachable";
  }
}
