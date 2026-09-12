/**
 * Shared `where` fragment for excluding soft-deleted rows — spread this into
 * a Prisma `where` instead of retyping `{ deletedAt: null }` at every nested
 * relation filter, so every selector stays in sync if the soft-delete
 * convention ever changes.
 */
export const NOT_DELETED = Object.freeze({ deletedAt: null });
