import * as path from "path";

import { Module } from "@nestjs/common";
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule as NestI18nModule,
} from "nestjs-i18n";

import { ALL_LANGUAGES } from "@/constants/language";

import { AppConfigService } from "../services/app-config.service";

@Module({
  imports: [
    NestI18nModule.forRootAsync({
      useFactory: (_appConfigService: AppConfigService) => ({
        fallbackLanguage: ALL_LANGUAGES,
        loaderOptions: {
          path: path.resolve("src", "i18n"),
          watch: true,
        },
      }),
      resolvers: [
        // { use: QueryResolver, options: ["lang"] }, // 1. Query parameter
        AcceptLanguageResolver, // 2. Accept-Language header, nếu header lang gửi lên không có trong folder i18n thì sẽ dùng fallbackLanguage
        new HeaderResolver(["x-lang"]), // 3. Custom header
      ],
      inject: [AppConfigService],
    }),
  ],
  controllers: [],
})
export class I18nModule {}
