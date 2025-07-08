import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { REQUEST_ROLE_PERMISSIONS_KEY } from "@/constants/auth.constant";
import { RoleResponseDto } from "@/dtos/role/role.dto";

const ActiveUserRole = createParamDecorator(
  (field: keyof RoleResponseDto, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const role = request[REQUEST_ROLE_PERMISSIONS_KEY] as RoleResponseDto;

    return field ? role[field] : role;
  },
);

export default ActiveUserRole;
