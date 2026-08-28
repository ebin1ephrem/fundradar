import "server-only";
import { PostgresSearchProvider } from "./postgres";
import type { SearchProvider } from "./types";

/**
 * The single seam between page code and the search engine. Swapping Postgres
 * for a hosted engine means writing one more class, not touching any page.
 */
export const search: SearchProvider = new PostgresSearchProvider();

export * from "./types";
