import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { I18nContext } from "nestjs-i18n";

export const CurrentLang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const i18n = I18nContext.current(ctx) as I18nContext;

    return i18n.lang;
  },
);
