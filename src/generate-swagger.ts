import fs from "fs";

import { NestFactory } from "@nestjs/core";
import YAML from "yaml";

import { AppModule } from "./app.module";
import { setupSwagger } from "./shared/utils/setup-swagger.util";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const data = YAML.stringify(setupSwagger(app));

  fs.writeFileSync("./swagger.yaml", data);
  await app.close();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
