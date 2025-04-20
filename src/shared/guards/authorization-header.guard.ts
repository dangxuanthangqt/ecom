import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AccessTokenGuard } from "./access-token.guard";
import { ApiKeyGuard } from "./api-key.guard";

import {
  AUTHORIZATION_HEADER_KEY,
  AuthorizationHeaderMetadata,
  AuthorizationType,
  CombinedAuthorizationCondition,
} from "@/constants/auth.constant";

@Injectable()
export class AuthorizationHeaderGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationHeaderGuard.name);

  private readonly authorizationTypeMapper = {
    [AuthorizationType.BEARER]: this.accessTokenGuard,
    [AuthorizationType.API_KEY]: this.apiKeyGuard,
    [AuthorizationType.NONE]: {
      canActivate: () => true,
    },
  };

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext) {
    const authorizationMetadata = this.reflector.getAllAndOverride<
      AuthorizationHeaderMetadata | undefined
    >(AUTHORIZATION_HEADER_KEY, [context.getHandler(), context.getClass()]);

    const {
      authorizationTypes = [AuthorizationType.BEARER],
      combinedCondition = CombinedAuthorizationCondition.AND, // Default value is AND
    } = authorizationMetadata ?? {};

    if (combinedCondition === CombinedAuthorizationCondition.OR) {
      for (const authorizationType of authorizationTypes) {
        const guardInstance = this.authorizationTypeMapper[authorizationType];
        try {
          const canActivate = await guardInstance.canActivate(context);
          if (canActivate) {
            return true;
          }
        } catch (error) {
          this.logger.error(error);
          continue;
        }
      }

      throw new UnauthorizedException({ message: "Unauthorized header." });
    }

    if (combinedCondition === CombinedAuthorizationCondition.AND) {
      for (const authorizationType of authorizationTypes) {
        const guardInstance = this.authorizationTypeMapper[authorizationType];

        await guardInstance.canActivate(context);
      }

      return true;
    }

    return true;
  }
}
