import { UnprocessableEntityException } from "@nestjs/common";

import { LanguageResponseDto } from "@/dtos/language/language.dto";
import { PageDto } from "@/dtos/shared/page.dto";

import { LanguageController } from "../language.controller";

import {
  ACTIVE_USER_ID,
  LANGUAGE_ID,
  LanguageControllerMocks,
  makeLanguage,
  makePaginatedLanguages,
  setupLanguageController,
} from "./language-controller-test-harness";

describe("LanguageController - getLanguages", () => {
  let controller: LanguageController;
  let mocks: LanguageControllerMocks;

  const makePaginationQuery = () => ({ page: 1, pageSize: 10 });

  beforeEach(async () => {
    ({ controller, mocks } = await setupLanguageController());
  });

  it("calls languageService.getLanguages with the pagination query", async () => {
    // Arrange
    const query = makePaginationQuery();
    mocks.languageService.getLanguages.mockResolvedValue(
      makePaginatedLanguages(),
    );

    // Act
    await controller.getLanguages(query);

    // Assert
    expect(mocks.languageService.getLanguages).toHaveBeenCalledWith(query);
  });

  it("returns paginated languages wrapped in PageDto", async () => {
    // Arrange
    const langItems = [
      makeLanguage({ name: "English" }),
      makeLanguage({ id: "fr-FR", name: "French" }),
    ];
    const serviceResponse = {
      data: langItems,
      pagination: {
        totalPages: 1,
        totalItems: 2,
        pageSize: 10,
        page: 1,
      },
    };
    mocks.languageService.getLanguages.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getLanguages(makePaginationQuery());

    // Assert
    expect(result).toBeInstanceOf(PageDto);
    expect(result.data).toHaveLength(2);
  });

  it("propagates rejection from languageService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Database error");
    mocks.languageService.getLanguages.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getLanguages(makePaginationQuery())).rejects.toBe(
      error,
    );
  });
});

describe("LanguageController - getLanguageById", () => {
  let controller: LanguageController;
  let mocks: LanguageControllerMocks;

  const makeLanguageParams = () => ({ id: LANGUAGE_ID });

  beforeEach(async () => {
    ({ controller, mocks } = await setupLanguageController());
  });

  it("calls languageService.getLanguageById with the language ID", async () => {
    // Arrange
    mocks.languageService.getLanguageById.mockResolvedValue(makeLanguage());

    // Act
    await controller.getLanguageById(makeLanguageParams());

    // Assert
    expect(mocks.languageService.getLanguageById).toHaveBeenCalledWith(
      LANGUAGE_ID,
    );
  });

  it("returns the language wrapped in LanguageResponseDto", async () => {
    // Arrange
    const serviceResponse = makeLanguage({
      id: LANGUAGE_ID,
      name: "English (US)",
    });
    mocks.languageService.getLanguageById.mockResolvedValue(serviceResponse);

    // Act
    const result = await controller.getLanguageById(makeLanguageParams());

    // Assert
    expect(result).toBeInstanceOf(LanguageResponseDto);
    expect(result.name).toBe("English (US)");
  });

  it("propagates rejection from languageService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Language not found");
    mocks.languageService.getLanguageById.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getLanguageById(makeLanguageParams())).rejects.toBe(
      error,
    );
  });
});

describe("LanguageController - createLanguage", () => {
  let controller: LanguageController;
  let mocks: LanguageControllerMocks;

  const makeCreateBody = () => ({
    name: "Spanish",
    id: "es",
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupLanguageController());
  });

  it("calls languageService.createLanguage with body and userId", async () => {
    // Arrange
    const body = makeCreateBody();
    mocks.languageService.createLanguage.mockResolvedValue(makeLanguage());

    // Act
    await controller.createLanguage(body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.languageService.createLanguage).toHaveBeenCalledWith(
      body,
      ACTIVE_USER_ID,
    );
  });

  it("returns the created language wrapped in LanguageResponseDto", async () => {
    // Arrange
    const created = makeLanguage({ name: "Spanish" });
    mocks.languageService.createLanguage.mockResolvedValue(created);

    // Act
    const result = await controller.createLanguage(
      makeCreateBody(),
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(LanguageResponseDto);
  });

  it("propagates rejection from languageService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Language already exists");
    mocks.languageService.createLanguage.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.createLanguage(makeCreateBody(), ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("LanguageController - updateLanguage", () => {
  let controller: LanguageController;
  let mocks: LanguageControllerMocks;

  const makeLanguageParams = () => ({ id: LANGUAGE_ID });

  const makeUpdateBody = () => ({
    name: "English (United States)",
    code: "en-US",
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupLanguageController());
  });

  it("calls languageService.updateLanguage with id, body, and userId", async () => {
    // Arrange
    const body = makeUpdateBody();
    mocks.languageService.updateLanguage.mockResolvedValue(makeLanguage());

    // Act
    await controller.updateLanguage(makeLanguageParams(), body, ACTIVE_USER_ID);

    // Assert
    expect(mocks.languageService.updateLanguage).toHaveBeenCalledWith({
      id: LANGUAGE_ID,
      body,
      userId: ACTIVE_USER_ID,
    });
  });

  it("returns the updated language wrapped in LanguageResponseDto", async () => {
    // Arrange
    const updated = makeLanguage({ name: "English (United States)" });
    mocks.languageService.updateLanguage.mockResolvedValue(updated);

    // Act
    const result = await controller.updateLanguage(
      makeLanguageParams(),
      makeUpdateBody(),
      ACTIVE_USER_ID,
    );

    // Assert
    expect(result).toBeInstanceOf(LanguageResponseDto);
  });

  it("propagates rejection from languageService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Language not found");
    mocks.languageService.updateLanguage.mockRejectedValue(error);

    // Act & Assert
    await expect(
      controller.updateLanguage(
        makeLanguageParams(),
        makeUpdateBody(),
        ACTIVE_USER_ID,
      ),
    ).rejects.toBe(error);
  });
});

describe("LanguageController - deleteLanguage", () => {
  let controller: LanguageController;
  let mocks: LanguageControllerMocks;

  const makeLanguageParams = () => ({ id: LANGUAGE_ID });

  beforeEach(async () => {
    ({ controller, mocks } = await setupLanguageController());
  });

  it("calls languageService.deleteLanguage with the language ID", async () => {
    // Arrange
    mocks.languageService.deleteLanguage.mockResolvedValue(makeLanguage());

    // Act
    await controller.deleteLanguage(makeLanguageParams());

    // Assert
    expect(mocks.languageService.deleteLanguage).toHaveBeenCalledWith({
      id: LANGUAGE_ID,
    });
  });

  it("returns the deleted language wrapped in LanguageResponseDto", async () => {
    // Arrange
    const deleted = makeLanguage();
    mocks.languageService.deleteLanguage.mockResolvedValue(deleted);

    // Act
    const result = await controller.deleteLanguage(makeLanguageParams());

    // Assert
    expect(result).toBeInstanceOf(LanguageResponseDto);
  });

  it("propagates rejection from languageService", async () => {
    // Arrange
    const error = new UnprocessableEntityException("Language not found");
    mocks.languageService.deleteLanguage.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.deleteLanguage(makeLanguageParams())).rejects.toBe(
      error,
    );
  });
});
