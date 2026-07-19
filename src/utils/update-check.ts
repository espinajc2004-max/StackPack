import fs from "node:fs/promises";
import path from "node:path";
import semver from "semver";
import { getStoragePaths } from "../storage/paths.js";

const PACKAGE_NAME = "stackpack-cli";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;

type UpdateCheckCache = {
  checkedAt: string;
  latest: string;
};

function cacheFilePath(): string {
  return path.join(getStoragePaths().cacheDir, "update-check.json");
}

async function readCachedLatest(): Promise<string | null> {
  try {
    const raw = JSON.parse(await fs.readFile(cacheFilePath(), "utf8")) as UpdateCheckCache;
    const fresh = Date.now() - Date.parse(raw.checkedAt) < CHECK_INTERVAL_MS;
    return fresh && semver.valid(raw.latest) ? raw.latest : null;
  } catch {
    return null;
  }
}

async function fetchLatestFromRegistry(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(REGISTRY_URL, { signal: controller.signal });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: unknown };
    if (typeof data.version !== "string" || !semver.valid(data.version)) return null;
    const cache: UpdateCheckCache = { checkedAt: new Date().toISOString(), latest: data.version };
    await fs.mkdir(path.dirname(cacheFilePath()), { recursive: true });
    await fs.writeFile(cacheFilePath(), JSON.stringify(cache), "utf8");
    return data.version;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Anonymous, best-effort check for a newer published version. Never blocks
 * for more than ~2s, runs at most once per day (cached in ~/.stackpack/cache),
 * fails silently offline, and is disabled entirely by STACKPACK_NO_UPDATE_CHECK.
 * It never updates anything by itself — it only returns a notice to display.
 */
export async function getUpdateNotice(currentVersion: string): Promise<string | null> {
  if (process.env.STACKPACK_NO_UPDATE_CHECK) return null;
  try {
    const latest = (await readCachedLatest()) ?? (await fetchLatestFromRegistry());
    if (!latest || !semver.valid(currentVersion) || !semver.gt(latest, currentVersion)) {
      return null;
    }
    return `Update available: ${currentVersion} → ${latest}\nRun: npm install -g ${PACKAGE_NAME}`;
  } catch {
    return null;
  }
}
