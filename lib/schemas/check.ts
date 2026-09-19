import { z } from "zod";

/** POST /api/check body (BACKEND_STRUCTURE.md §6). */
export const checkNameBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export type CheckNameBody = z.infer<typeof checkNameBodySchema>;
