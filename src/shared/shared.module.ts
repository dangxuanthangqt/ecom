import { Global, Module, Provider } from "@nestjs/common";

import { AppConfigService } from "./services/app-config.service";

const providers: Provider[] = [AppConfigService];

@Global()
@Module({
  imports: [],
  exports: providers, // Exporting providers to be used in other modules
  providers,
})
export class SharedModule {}
