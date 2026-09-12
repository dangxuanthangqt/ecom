import { NotFoundException } from "@nestjs/common";

import { LanguageService } from "../language.service";

import {
  LANGUAGE_ID,
  makeLanguage,
  setupLanguageService,
  LanguageServiceMocks,
} from "./language-service-test-harness";

describe("LanguageService - deleteLanguage", () => {
  let service: LanguageService;
  let mocks: LanguageServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupLanguageService());
    mocks.languageRepository.deleteLanguageById.mockResolvedValue(
      makeLanguage({ deletedAt: new Date() }),
    );
  });

  it("deletes the language by id", async () => {
    // Act
    await service.deleteLanguage({ id: LANGUAGE_ID });

    // Assert
    expect(mocks.languageRepository.deleteLanguageById).toHaveBeenCalledWith({
      id: LANGUAGE_ID,
    });
  });

  it("returns the deleted row untouched", async () => {
    // Arrange
    const deleted = makeLanguage({ deletedAt: new Date() });
    mocks.languageRepository.deleteLanguageById.mockResolvedValue(deleted);

    // Act
    const result = await service.deleteLanguage({ id: LANGUAGE_ID });

    // Assert
    expect(result).toBe(deleted);
  });

  it("propagates the repository error when language does not exist", async () => {
    // Arrange
    const notFound = new NotFoundException({ message: "Language not found." });
    mocks.languageRepository.deleteLanguageById.mockRejectedValue(notFound);

    // Act
    const promise = service.deleteLanguage({ id: LANGUAGE_ID });

    // Assert
    await expect(promise).rejects.toBe(notFound);
  });
});
