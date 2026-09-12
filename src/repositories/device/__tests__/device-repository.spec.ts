import { DeviceRepository } from "../device.repository";

import {
  setupDeviceRepository,
  DEVICE_ID,
  USER_ID,
  makeDevice,
  containing,
  stringContaining,
  DeviceRepositoryMocks,
  createPrismaUniqueError,
  createPrismaNotFoundError,
  createPrismaForeignKeyError,
} from "./device-repository-test-harness";

describe("DeviceRepository - createDevice", () => {
  let repository: DeviceRepository;
  let mocks: DeviceRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupDeviceRepository());
  });

  it("creates a device with provided data", async () => {
    // Arrange
    const device = makeDevice();
    mocks.prismaService.device.create.mockResolvedValue(device);

    // Act
    const result = await repository.createDevice({
      userId: USER_ID,
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      isActive: true,
    });

    // Assert
    expect(mocks.prismaService.device.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        isActive: true,
      },
    });
    expect(result).toEqual(device);
  });

  it("throws UnprocessableEntityException on duplicate device", async () => {
    // Arrange
    mocks.prismaService.device.create.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createDevice({
      userId: USER_ID,
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      isActive: true,
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("already exists"),
      }),
    });
  });

  it("throws UnprocessableEntityException on invalid user foreign key", async () => {
    // Arrange
    mocks.prismaService.device.create.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.createDevice({
      userId: "invalid-user-id",
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      isActive: true,
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: stringContaining("foreign key"),
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    mocks.prismaService.device.create.mockRejectedValue(
      new Error("Unexpected error"),
    );

    // Act
    const promise = repository.createDevice({
      userId: USER_ID,
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      isActive: true,
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("DeviceRepository - updateDevice", () => {
  let repository: DeviceRepository;
  let mocks: DeviceRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupDeviceRepository());
  });

  it("updates a device with provided arguments", async () => {
    // Arrange
    const updatedDevice = makeDevice({ isActive: false });
    mocks.prismaService.device.update.mockResolvedValue(updatedDevice);

    // Act
    const result = await repository.updateDevice({
      where: { id: DEVICE_ID },
      data: { isActive: false },
    });

    // Assert
    expect(mocks.prismaService.device.update).toHaveBeenCalledWith({
      where: { id: DEVICE_ID },
      data: { isActive: false },
    });
    expect(result).toEqual(updatedDevice);
  });

  it("throws NotFoundException when device not found", async () => {
    // Arrange
    mocks.prismaService.device.update.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.updateDevice({
      where: { id: "nonexistent-id" },
      data: { isActive: false },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Device not found.",
      }),
    });
  });

  it("throws UnprocessableEntityException on duplicate device", async () => {
    // Arrange
    mocks.prismaService.device.update.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.updateDevice({
      where: { id: DEVICE_ID },
      data: { ip: "duplicate-ip" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Device already exists.",
      }),
    });
  });

  it("throws UnprocessableEntityException on foreign key constraint", async () => {
    // Arrange
    mocks.prismaService.device.update.mockRejectedValue(
      createPrismaForeignKeyError(),
    );

    // Act
    const promise = repository.updateDevice({
      where: { id: DEVICE_ID },
      data: { userId: "invalid-user-id" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});
