import * as path from "path";

import { Module } from "@nestjs/common";
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule as NestI18nModule,
} from "nestjs-i18n";

import { ALL_LANGUAGES } from "@/constants/language";

@Module({
  imports: [
    NestI18nModule.forRootAsync({
      useFactory: () => ({
        fallbackLanguage: ALL_LANGUAGES,
        loaderOptions: {
          // Resolved from this file rather than the process cwd, so the one
          // expression holds for `src/**` under ts-jest and `dist/src/**`
          // after a build. The cwd-based "dist/i18n" it replaced stopped
          // existing once `prisma/` joined the build and pushed every emitted
          // file down a level.
          path: path.resolve(__dirname, "..", "..", "i18n"),
          watch: true,
        },
      }),
      resolvers: [
        // { use: QueryResolver, options: ["lang"] }, // 1. Query parameter
        AcceptLanguageResolver, // 2. Accept-Language header, nếu header lang gửi lên không có trong folder i18n thì sẽ dùng fallbackLanguage
        new HeaderResolver(["x-lang"]), // 3. Custom header
      ],
    }),
  ],
  controllers: [],
})
export class I18nModule {}
