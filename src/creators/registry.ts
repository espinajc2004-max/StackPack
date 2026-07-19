import type { CreatorAdapter, CreatorId } from "./types.js";
import { viteAdapter } from "./vite/adapter.js";
import { nextAdapter } from "./next/adapter.js";

export const allCreators: CreatorAdapter[] = [viteAdapter, nextAdapter];

export function getCreator(id: CreatorId): CreatorAdapter {
  const creator = allCreators.find((adapter) => adapter.id === id);
  if (!creator) throw new Error(`Unknown creator adapter: ${id}`);
  return creator;
}
