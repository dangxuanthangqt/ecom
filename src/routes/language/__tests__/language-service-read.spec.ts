import { NotFoundException } from "@nestjs/common";

import { ORDER, ORDER_BY } from "@/constants/order";

import { LanguageService } from "../language.service";

import {
  containing,
  LANGUAGE_ID,
  makeLanguage,
  setupLanguageService,
  LanguageServiceMocks,
} from "./language-service-test-harness";

describe("LanguageService - getLanguages", () => {
  let service: LanguageService;
  let mocks: LanguageServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupLanguageService());
  });

  it("falls back to page 1, size 10, ascending by createdAt, no keyword when nothing is supplied", async () => {
    // Arrange
    const languages = [makeLanguage()];
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages,
      languagesCount: 1,
    });

    // Act
    const result = await service.getLanguages({});

    // Assert
    expect(result).toEqual({
      data: languages,
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    });
    expect(mocks.languageRepository.findManyLanguages).toHaveBeenCalledWith(
      containing({
        where: containing({ name: containing({ contains: "" }) }),
        skip: 0,
        take: 10,
        orderBy: { [ORDER_BY.CREATED_AT]: ORDER.ASC },
      }),
    );
  });

  it("honours an explicit page, size, direction and sort field", async () => {
    // Arrange
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages: [],
      languagesCount: 0,
    });

    // Act
    await service.getLanguages({
      page: 2,
      pageSize: 20,
      order: ORDER.DESC,
      orderBy: ORDER_BY.UPDATED_AT,
    });

    // Assert
    expect(mocks.languageRepository.findManyLanguages).toHaveBeenCalledWith(
      containing({
        skip: 20,
        take: 20,
        orderBy: { [ORDER_BY.UPDATED_AT]: ORDER.DESC },
      }),
    );
  });

  it("applies a keyword filter case-insensitively", async () => {
    // Arrange
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages: [],
      languagesCount: 0,
    });

    // Act
    await service.getLanguages({ keyword: "Vietnamese" });

    // Assert
    expect(mocks.languageRepository.findManyLanguages).toHaveBeenCalledWith(
      containing({
        where: containing({
          name: containing({
            contains: "Vietnamese",
            mode: "insensitive",
          }),
        }),
      }),
    );
  });

  it("calculates total pages correctly", async () => {
    // Arrange
    const languages = [makeLanguage()];
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages,
      languagesCount: 25,
    });

    // Act
    const result = await service.getLanguages({ pageSize: 10 });

    // Assert
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 3,
      totalItems: 25,
    });
  });

  it("rounds up a partial last page", async () => {
    // Arrange
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages: [],
      languagesCount: 21,
    });

    // Act
    const result = await service.getLanguages({ pageSize: 10 });

    // Assert
    expect(result.pagination.totalPages).toBe(3);
  });

  it("reports zero pages when no language matches", async () => {
    // Arrange
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages: [],
      languagesCount: 0,
    });

    // Act
    const result = await service.getLanguages({});

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination.totalPages).toBe(0);
  });

  it("normalizes sort order to lowercase before passing to repository", async () => {
    // Arrange
    mocks.languageRepository.findManyLanguages.mockResolvedValue({
      languages: [],
      languagesCount: 0,
    });

    // Act
    await service.getLanguages({
      order: "ASC" as unknown as typeof ORDER.ASC,
    });

    // Assert
    expect(mocks.languageRepository.findManyLanguages).toHaveBeenCalledWith(
      containing({
        orderBy: { [ORDER_BY.CREATED_AT]: "asc" },
      }),
    );
  });
});

describe("LanguageService - getLanguageById", () => {
  let service: LanguageService;
  let mocks: LanguageServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupLanguageService());
  });

  it("returns the language when it exists", async () => {
    // Arrange
    const language = makeLanguage();
    mocks.languageRepository.findUniqueLanguage.mockResolvedValue(language);

    // Act
    const result = await service.getLanguageById(LANGUAGE_ID);

    // Assert
    expect(result).toBe(language);
    expect(mocks.languageRepository.findUniqueLanguage).toHaveBeenCalledWith(
      LANGUAGE_ID,
    );
  });

  it("propagates the repository error when language does not exist", async () => {
    // Arrange
    const notFound = new NotFoundException({ message: "Language not found." });
    mocks.languageRepository.findUniqueLanguage.mockRejectedValue(notFound);

    // Act
    const promise = service.getLanguageById(LANGUAGE_ID);

    // Assert
    await expect(promise).rejects.toBe(notFound);
  });
});
