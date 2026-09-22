import { Injectable, Logger } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";
import { Device, Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class DeviceRepository {
  private readonly logger = new Logger(DeviceRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches multiple devices based on the provided criteria.
   *
   * @param where - The filtering criteria for devices.
   * @param take - The maximum number of devices to return.
   * @param skip - The number of devices to skip.
   * @param orderBy - The ordering criteria for the devices.
   * @returns An object containing the fetched devices and their count.
   */
  async createDevice(
    data: Pick<Device, "userId" | "ip" | "isActive" | "userAgent">,
  ): Promise<Device> {
    try {
      const device = await this.prismaService.device.create({
        data,
      });

      return device;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        // Handle unique constraint violation (e.g., duplicate device)
        throwHttpException({
          type: "unprocessable",
          code: ErrorCode.DEVICE_ALREADY_EXISTS,
          message: `Device already exists.`,
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        // Handle foreign key constraint violation (e.g., invalid userId)

        throwHttpException({
          type: "unprocessable",
          code: ErrorCode.REFERENCE_INVALID,
          message: `Invalid foreign key constraint.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to create device.`,
      });
    }
  }

  async updateDevice<T extends Prisma.DeviceUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.DeviceUpdateArgs>,
  ): Promise<Prisma.DeviceGetPayload<T>> {
    try {
      const device = await this.prismaService.device.update(args);

      return device;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          code: ErrorCode.DEVICE_NOT_FOUND,
          message: "Device not found.",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          code: ErrorCode.DEVICE_ALREADY_EXISTS,
          message: "Device already exists.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          code: ErrorCode.REFERENCE_INVALID,
          message: "Invalid foreign key constraint.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update device.",
      });
    }
  }
}
