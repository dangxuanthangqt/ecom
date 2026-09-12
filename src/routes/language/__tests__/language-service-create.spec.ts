import { UnprocessableEntityException } from "@nestjs/common";

import { LanguageService } from "../language.service";

import {
  containing,
  LANGUAGE_ID,
  makeLanguage,
  setupLanguageService,
  USER_ID,
  LanguageServiceMocks,
} from "./language-service-test-harness";

describe("LanguageService - createLanguage", () => {
  let service: LanguageService;
  let mocks: LanguageServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupLanguageService());
    mocks.languageRepository.createLanguage.mockResolvedValue(makeLanguage());
  });

  it("creates a language with the supplied name and id", async () => {
    // Act
    await service.createLanguage(
      {
        id: LANGUAGE_ID,
        name: "English",
      },
      USER_ID,
    );

    // Assert
    expect(mocks.languageRepository.createLanguage).toHaveBeenCalledWith({
      id: LANGUAGE_ID,
      name: "English",
      createdById: USER_ID,
    });
  });

  it("stamps the creator onto the new row", async () => {
    // Act
    await service.createLanguage(
      {
        id: LANGUAGE_ID,
        name: "Vietnamese",
      },
      USER_ID,
    );

    // Assert
    expect(mocks.languageRepository.createLanguage).toHaveBeenCalledWith(
      containing({
        createdById: USER_ID,
      }),
    );
  });

  it("returns the created row untouched", async () => {
    // Arrange
    const created = makeLanguage({ name: "Created Language" });
    mocks.languageRepository.createLanguage.mockResolvedValue(created);

    // Act
    const result = await service.createLanguage(
      {
        id: LANGUAGE_ID,
        name: "Created Language",
      },
      USER_ID,
    );

    // Assert
    expect(result).toBe(created);
  });

  it("propagates a duplicate-id rejection from the repository", async () => {
    // Arrange
    const conflict = new UnprocessableEntityException({
      message: "Language ID already exists.",
    });
    mocks.languageRepository.createLanguage.mockRejectedValue(conflict);

    // Act
    const promise = service.createLanguage(
      {
        id: LANGUAGE_ID,
        name: "Duplicate",
      },
      USER_ID,
    );

    // Assert
    await expect(promise).rejects.toBe(conflict);
  });
});
