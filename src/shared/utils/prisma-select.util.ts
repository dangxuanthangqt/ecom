/**
 * Replacement for `Prisma.validator`, which Prisma 7's `prisma-client`
 * generator no longer ships. Same shape on purpose — a curried identity
 * function — so every `select` constant keeps its exact literal type (needed
 * by `Prisma.XGetPayload<{ select: typeof x }>`) while still being checked
 * against the model's `Select` input.
 *
 * A plain `extends` constraint would accept unknown keys (`{ emial: true }`),
 * because object literals only get excess-property checks against a concrete
 * target type. The mapped intersection below re-creates that check for the top
 * level: every key not in `TSelect` must be `never`, so a typo fails here, at
 * the definition, instead of at some call site far away.
 *
 *   export const userSelect = defineSelect<Prisma.UserSelect>()({ id: true });
 */
export const defineSelect =
  <TSelect>() =>
  <const TValue extends TSelect>(
    select: TValue & Record<Exclude<keyof TValue, keyof TSelect>, never>,
  ): TValue =>
    select;
