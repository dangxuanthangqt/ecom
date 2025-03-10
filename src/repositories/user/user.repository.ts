import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";

import { UserInputData, UserResponseData } from "./user.repository.type";

import { PrismaService } from "@/shared/services/prisma.service";
import { isUniqueConstraintPrismaError } from "@/shared/utils/prisma-error";

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}
  private readonly logger = new Logger(UserRepository.name);

  async createUser(data: UserInputData): Promise<UserResponseData> {
    this.logger.log(`Creating user with email: ` + data.email);

    try {
      const user = await this.prismaService.user.create({
        data,
        omit: {
          password: true,
          totpSecret: true,
        },
      });

      return user;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Email is already exist.",
            path: "email",
          },
        ]);
      }
      throw error;
    }
  }
}
