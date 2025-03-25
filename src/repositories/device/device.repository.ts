import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Device, Prisma } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";

@Injectable()
export class DeviceRepository {
  private readonly logger = new Logger(DeviceRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createDevice(
    data: Pick<Device, "userId" | "ip" | "isActive" | "userAgent">,
  ): Promise<Device> {
    try {
      const device = await this.prismaService.device.create({
        data,
      });

      return device;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create device`, error.stack);
      }

      if (isUniqueConstraintPrismaError(error)) {
        // Handle unique constraint violation (e.g., duplicate device)
        throw new UnprocessableEntityException([
          {
            message: "Device already exists.",
            path: "device", // You might want to specify a more specific path if applicable
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        // Handle foreign key constraint violation (e.g., invalid userId)
        throw new UnprocessableEntityException([
          {
            message: "Invalid user ID.",
            path: "userId",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create device.",
          path: "device",
        },
      ]);
    }
  }

  async updateDevice<T extends Prisma.DeviceUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.DeviceUpdateArgs>,
  ): Promise<Prisma.DeviceGetPayload<T>> {
    try {
      const device = await this.prismaService.device.update(args);

      return device;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to update device with args: ${JSON.stringify(args)}`,
          error.stack,
        );
      }

      if (isRecordNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: "Device not found.",
            path: "device",
          },
        ]);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Device already exists.",
            path: "device",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Invalid user ID.",
            path: "userId",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to update device.",
          path: "device",
        },
      ]);
    }
  }
}
