import { ScreamingSnakeCase } from "type-fest";

export type OrderByTypeToOrderByFieldType<T> = {
  [K in T as ScreamingSnakeCase<`${string & K}`>]: K;
};
