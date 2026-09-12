import { NotFoundException } from "@nestjs/common";

import { LanguageService } from "../language.service";

import {
  containing,
  LANGUAGE_ID,
  makeLanguage,
  setupLanguageService,
  USER_ID,
  LanguageServiceMocks,
} from "./language-service-test-harness";

describe("LanguageService - updateLanguage", () => {
  let service: LanguageService;
  let mocks: LanguageServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupLanguageService());
    mocks.languageRepository.updateLanguageById.mockResolvedValue(
      makeLanguage({ name: "Updated" }),
    );
  });

  it("updates the language name and stamps the editor", async () => {
    // Act
    await service.updateLanguage({
      id: LANGUAGE_ID,
      body: { name: "Updated Language" },
      userId: USER_ID,
    });

    // Assert
    expect(mocks.languageRepository.updateLanguageById).toHaveBeenCalledWith({
      where: { id: LANGUAGE_ID },
      data: containing({
        name: "Updated Language",
        updatedById: USER_ID,
      }),
    });
  });

  it("returns the updated row untouched", async () => {
    // Arrange
    const updated = makeLanguage({ name: "French" });
    mocks.languageRepository.updateLanguageById.mockResolvedValue(updated);

    // Act
    const result = await service.updateLanguage({
      id: LANGUAGE_ID,
      body: { name: "French" },
      userId: USER_ID,
    });

    // Assert
    expect(result).toBe(updated);
  });

  it("propagates the repository error when language does not exist", async () => {
    // Arrange
    const notFound = new NotFoundException({ message: "Language not found." });
    mocks.languageRepository.updateLanguageById.mockRejectedValue(notFound);

    // Act
    const promise = service.updateLanguage({
      id: LANGUAGE_ID,
      body: { name: "Updated" },
      userId: USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(notFound);
  });
});
