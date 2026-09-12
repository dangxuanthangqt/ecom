/** Row counts the volume seeder generates. Every one is overridable per run. */
export interface VolumeConfig {
  users: number;
  brands: number;
  categories: number;
  products: number;
  /** SKUs generated per product. */
  skusPerProduct: number;
  orders: number;
  /** Line items generated per order. */
  itemsPerOrder: number;
  reviews: number;
  cartItems: number;
  /** Rows per createMany call. */
  batchSize: number;
  /** Fixed RNG seed, so two runs with the same flags produce the same shape. */
  randomSeed: number;
}

const DEFAULTS: VolumeConfig = {
  users: 500,
  brands: 50,
  categories: 30,
  products: 2_000,
  skusPerProduct: 3,
  orders: 5_000,
  itemsPerOrder: 2,
  reviews: 3_000,
  cartItems: 1_000,
  batchSize: 1_000,
  randomSeed: 20_260_913,
};

const NUMERIC_KEYS = Object.keys(DEFAULTS) as (keyof VolumeConfig)[];

/** Parses `--products=5000 --orders=20000` style flags over the defaults. */
export const parseVolumeConfig = (argv: string[]): VolumeConfig => {
  const config = { ...DEFAULTS };

  for (const arg of argv) {
    const match = /^--([a-zA-Z]+)=(\d+)$/.exec(arg);

    if (!match) {
      continue;
    }

    const key = NUMERIC_KEYS.find(
      (candidate) => candidate.toLowerCase() === match[1].toLowerCase(),
    );

    if (!key) {
      throw new Error(
        `Unknown volume flag "--${match[1]}". Known: ${NUMERIC_KEYS.join(", ")}`,
      );
    }

    config[key] = Number(match[2]);
  }

  if (config.batchSize < 1) {
    throw new Error("--batchSize must be at least 1");
  }

  return config;
};

export const describeVolume = (config: VolumeConfig): string =>
  [
    `${config.users} users`,
    `${config.products} products`,
    `${config.products * config.skusPerProduct} SKUs`,
    `${config.orders} orders`,
    `${config.reviews} reviews`,
  ].join(", ");
