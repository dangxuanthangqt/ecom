import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

/**
 * BR-R05: the public review listing exposes only the author's display name
 * and avatar — never email, phone or account status. Kept separate from
 * `user.selector.ts` (which carries those fields) so widening that selector
 * later can never silently leak PII through a review response.
 */
export const reviewAuthorSelect = defineSelect<Prisma.UserSelect>()({
  id: true,
  name: true,
  avatar: true,
});
