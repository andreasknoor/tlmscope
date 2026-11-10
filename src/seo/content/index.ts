import type { Lang } from "../pages.ts";
import { de } from "./de.ts";
import { en } from "./en.ts";
import type { Content } from "./types.ts";

export const CONTENT: Record<Lang, Content> = { en, de };
