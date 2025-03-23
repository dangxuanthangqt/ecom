import { SetMetadata } from "@nestjs/common";

import {
  AUTHORIZATION_HEADER_KEY,
  AuthorizationType,
  AuthorizationTypeType,
  CombinedAuthorizationConditionType,
} from "@/constants/auth.constant";

export const AuthApi = (
  authorizationTypes?: AuthorizationTypeType[],
  combinedCondition?: CombinedAuthorizationConditionType,
) =>
  SetMetadata(AUTHORIZATION_HEADER_KEY, {
    authorizationTypes,
    combinedCondition,
  });

export const IsPublicApi = () => AuthApi([AuthorizationType.NONE]);
