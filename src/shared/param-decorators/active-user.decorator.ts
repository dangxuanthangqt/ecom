import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

import { REQUEST_USER_KEY } from "@/constants/auth.constant";
import { AccessTokenPayload } from "@/types/jwt-payload.type";

const ActiveUser = createParamDecorator(
  (field: keyof AccessTokenPayload, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request[REQUEST_USER_KEY] as AccessTokenPayload;

    return field ? user[field] : user;
  },
);

export default ActiveUser;
