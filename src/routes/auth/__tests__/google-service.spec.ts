import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import { GoogleService } from "../google.service";

import {
  containing,
  makeDevice,
  makeUser,
  setupGoogleService,
  ROLE_ID,
  USER_ID,
  DEVICE_ID,
  GoogleServiceMocks,
} from "./google-service-test-harness";

jest.mock("googleapis");

interface GenerateAuthUrlOptions {
  state: string;
  scope: string[];
  access_type: string;
  include_granted_scopes: boolean | string;
}

describe("GoogleService - getAuthorizationUrl", () => {
  let service: GoogleService;

  beforeEach(async () => {
    // Mock OAuth2 client BEFORE creating service
    // Use implementation function to generate realistic URLs with proper state encoding
    const mockOAuth2ClientForAuth = {
      generateAuthUrl: jest
        .fn()
        .mockImplementation((options: GenerateAuthUrlOptions) => {
          // Build URL manually to preserve state encoding (state is base64, not URL-encoded)
          const state = encodeURIComponent(options.state);
          const scope = encodeURIComponent(options.scope.join(" "));
          return `https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client-id&access_type=${options.access_type}&scope=${scope}&include_granted_scopes=${options.include_granted_scopes}&state=${state}`;
        }),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
    };

    (google.auth.OAuth2 as unknown as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockOAuth2ClientForAuth);

    ({ service } = await setupGoogleService());
  });

  it("generates an authorization URL with encoded state containing device info", () => {
    // Act
    const url = service.getAuthorizationUrl({
      userAgent: "Mozilla/5.0",
      ip: "192.168.1.1",
    });

    // Assert
    expect(url).toContain("https://accounts.google.com");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("scope=");
    expect(url).toContain("include_granted_scopes=true");
    expect(url).toContain("state=");
  });

  it("encodes userAgent and ip in base64 state parameter", () => {
    // Act
    const url = service.getAuthorizationUrl({
      userAgent: "Mozilla/5.0 Custom",
      ip: "192.168.1.100",
    });

    // Assert
    const stateMatch = url.match(/state=([^&]+)/);
    expect(stateMatch).toBeTruthy();

    // State is URL-encoded in the URL, so decode it first before base64 decoding
    const encodedState = decodeURIComponent(stateMatch![1]);
    const decodedState = JSON.parse(
      Buffer.from(encodedState, "base64").toString(),
    ) as { userAgent: string; ip: string };

    expect(decodedState).toEqual({
      userAgent: "Mozilla/5.0 Custom",
      ip: "192.168.1.100",
    });
  });

  it("requests both email and profile scopes", () => {
    // Act
    const url = service.getAuthorizationUrl({
      userAgent: "Mozilla/5.0",
      ip: "192.168.1.1",
    });

    // Assert
    expect(url).toContain(
      encodeURIComponent("https://www.googleapis.com/auth/userinfo.email"),
    );
    expect(url).toContain(
      encodeURIComponent("https://www.googleapis.com/auth/userinfo.profile"),
    );
  });
});

describe("GoogleService - googleCallback", () => {
  let service: GoogleService;
  let mocks: GoogleServiceMocks;

  const generateState = (userAgent: string, ip: string) =>
    Buffer.from(JSON.stringify({ userAgent, ip })).toString("base64");

  beforeEach(async () => {
    // Mock OAuth2 client BEFORE creating service
    const mockOAuth2ClientForCallback = {
      generateAuthUrl: jest
        .fn()
        .mockImplementation((options: GenerateAuthUrlOptions) => {
          // Build URL manually to preserve state encoding (state is base64, not URL-encoded)
          const state = encodeURIComponent(options.state);
          const scope = encodeURIComponent(options.scope.join(" "));
          return `https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client-id&access_type=${options.access_type}&scope=${scope}&include_granted_scopes=${options.include_granted_scopes}&state=${state}`;
        }),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
    };

    (google.auth.OAuth2 as unknown as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockOAuth2ClientForCallback);

    const setupResult = await setupGoogleService();
    service = setupResult.service;
    mocks = setupResult.mocks;
    mocks.authService.generateTokens.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    mocks.hashingService.hash.mockReturnValue("hashed-default-password");
    mocks.sharedRoleRepository.getClientRoleId.mockResolvedValue(ROLE_ID);
  });

  it("handles OAuth callback for a new user and creates an account", async () => {
    // Arrange
    const state = generateState("Mozilla/5.0", "192.168.1.1");
    mocks.sharedUserRepository.findFirst.mockResolvedValue(null);

    const newUser = makeUser({
      email: "new@example.com",
      name: "New User",
    });
    mocks.sharedUserRepository.createUser.mockResolvedValue(newUser);

    const device = makeDevice();
    mocks.deviceRepository.createDevice.mockResolvedValue(device);

    const oauth2ClientMock = {
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-token" },
      }),
      setCredentials: jest.fn(),
    };
    service["oauth2Client"] = oauth2ClientMock as unknown as OAuth2Client;

    const mockUserinfo = {
      get: jest.fn().mockResolvedValue({
        data: {
          email: "new@example.com",
          name: "New User",
        },
      }),
    };
    (google.oauth2 as unknown as jest.Mock) = jest.fn().mockReturnValue({
      userinfo: mockUserinfo,
    });

    // Act
    const result = await service.googleCallback("auth-code", state);

    // Assert
    expect(mocks.sharedUserRepository.findFirst).toHaveBeenCalledWith(
      containing({
        where: containing({ email: "new@example.com" }),
      }),
    );
    expect(mocks.sharedUserRepository.createUser).toHaveBeenCalled();
    expect(mocks.deviceRepository.createDevice).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("handles OAuth callback for an existing user and logs them in", async () => {
    // Arrange
    const state = generateState("Mozilla/5.0", "192.168.1.1");
    const existingUser = makeUser();
    mocks.sharedUserRepository.findFirst.mockResolvedValue(existingUser);

    const device = makeDevice();
    mocks.deviceRepository.createDevice.mockResolvedValue(device);

    const oauth2ClientMock = {
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-token" },
      }),
      setCredentials: jest.fn(),
    };
    service["oauth2Client"] = oauth2ClientMock as unknown as OAuth2Client;

    const mockUserinfo = {
      get: jest.fn().mockResolvedValue({
        data: {
          email: "user@example.com",
          name: "John Doe",
        },
      }),
    };
    (google.oauth2 as unknown as jest.Mock) = jest.fn().mockReturnValue({
      userinfo: mockUserinfo,
    });

    // Act
    const result = await service.googleCallback("auth-code", state);

    // Assert
    expect(mocks.sharedUserRepository.createUser).not.toHaveBeenCalled();
    expect(mocks.deviceRepository.createDevice).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("validates state parameter format", async () => {
    // Arrange
    const invalidState = "not-valid-base64";

    // Act
    const promise = service.googleCallback("code", invalidState);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Invalid state data." },
    });
  });

  it("validates state contains required fields (userAgent and ip)", async () => {
    // Arrange
    const invalidState = Buffer.from(
      JSON.stringify({ incomplete: "data" }),
    ).toString("base64");

    // Act
    const promise = service.googleCallback("code", invalidState);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
    });
  });

  it("validates that state ip is a valid IP address", async () => {
    // Arrange
    const invalidIpState = Buffer.from(
      JSON.stringify({ userAgent: "Mozilla/5.0", ip: "not-an-ip" }),
    ).toString("base64");

    // Act
    const promise = service.googleCallback("code", invalidIpState);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
    });
  });

  it("rejects when state userAgent is empty", async () => {
    // Arrange
    const emptyUserAgentState = Buffer.from(
      JSON.stringify({ userAgent: "", ip: "192.168.1.1" }),
    ).toString("base64");

    // Act
    const promise = service.googleCallback("code", emptyUserAgentState);

    // Assert
    await expect(promise).rejects.toMatchObject({
      status: 500,
    });
  });

  it("creates a device record with validated state data", async () => {
    // Arrange
    const state = generateState("Mozilla/5.0 Test", "10.0.0.1");
    const user = makeUser();
    mocks.sharedUserRepository.findFirst.mockResolvedValue(user);

    const device = makeDevice({
      userAgent: "Mozilla/5.0 Test",
      ip: "10.0.0.1",
    });
    mocks.deviceRepository.createDevice.mockResolvedValue(device);

    const oauth2ClientMock = {
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-token" },
      }),
      setCredentials: jest.fn(),
    };
    service["oauth2Client"] = oauth2ClientMock as unknown as OAuth2Client;

    const mockUserinfo = {
      get: jest.fn().mockResolvedValue({
        data: {
          email: "user@example.com",
          name: "John Doe",
        },
      }),
    };
    (google.oauth2 as unknown as jest.Mock) = jest.fn().mockReturnValue({
      userinfo: mockUserinfo,
    });

    // Act
    await service.googleCallback("auth-code", state);

    // Assert
    expect(mocks.deviceRepository.createDevice).toHaveBeenCalledWith(
      containing({
        userAgent: "Mozilla/5.0 Test",
        ip: "10.0.0.1",
        isActive: true,
      }),
    );
  });

  it("assigns the client role to newly created users", async () => {
    // Arrange
    const state = generateState("Mozilla/5.0", "192.168.1.1");
    mocks.sharedUserRepository.findFirst.mockResolvedValue(null);

    const newUser = makeUser({ roleId: ROLE_ID });
    mocks.sharedUserRepository.createUser.mockResolvedValue(newUser);
    mocks.deviceRepository.createDevice.mockResolvedValue(makeDevice());

    const oauth2ClientMock = {
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-token" },
      }),
      setCredentials: jest.fn(),
    };
    service["oauth2Client"] = oauth2ClientMock as unknown as OAuth2Client;

    const mockUserinfo = {
      get: jest.fn().mockResolvedValue({
        data: {
          email: "new@example.com",
          name: "New User",
        },
      }),
    };
    (google.oauth2 as unknown as jest.Mock) = jest.fn().mockReturnValue({
      userinfo: mockUserinfo,
    });

    // Act
    await service.googleCallback("auth-code", state);

    // Assert
    expect(mocks.sharedRoleRepository.getClientRoleId).toHaveBeenCalled();
    expect(mocks.sharedUserRepository.createUser).toHaveBeenCalledWith(
      containing({
        data: containing({ roleId: ROLE_ID }),
      }),
    );
  });

  it("hashes a default password for new users", async () => {
    // Arrange
    const state = generateState("Mozilla/5.0", "192.168.1.1");
    mocks.sharedUserRepository.findFirst.mockResolvedValue(null);

    const newUser = makeUser();
    mocks.sharedUserRepository.createUser.mockResolvedValue(newUser);
    mocks.deviceRepository.createDevice.mockResolvedValue(makeDevice());

    const oauth2ClientMock = {
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-token" },
      }),
      setCredentials: jest.fn(),
    };
    service["oauth2Client"] = oauth2ClientMock as unknown as OAuth2Client;

    const mockUserinfo = {
      get: jest.fn().mockResolvedValue({
        data: {
          email: "new@example.com",
          name: "New User",
        },
      }),
    };
    (google.oauth2 as unknown as jest.Mock) = jest.fn().mockReturnValue({
      userinfo: mockUserinfo,
    });

    // Act
    await service.googleCallback("auth-code", state);

    // Assert
    expect(mocks.hashingService.hash).toHaveBeenCalledWith("changeme");
  });

  it("generates authentication tokens with user and role info", async () => {
    // Arrange
    const state = generateState("Mozilla/5.0", "192.168.1.1");
    const user = makeUser({ id: USER_ID, roleId: ROLE_ID });
    mocks.sharedUserRepository.findFirst.mockResolvedValue(user);
    mocks.deviceRepository.createDevice.mockResolvedValue(
      makeDevice({ id: DEVICE_ID, userId: USER_ID }),
    );

    const oauth2ClientMock = {
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-token" },
      }),
      setCredentials: jest.fn(),
    };
    service["oauth2Client"] = oauth2ClientMock as unknown as OAuth2Client;

    const mockUserinfo = {
      get: jest.fn().mockResolvedValue({
        data: {
          email: "user@example.com",
          name: "John Doe",
        },
      }),
    };
    (google.oauth2 as unknown as jest.Mock) = jest.fn().mockReturnValue({
      userinfo: mockUserinfo,
    });

    // Act
    await service.googleCallback("auth-code", state);

    // Assert
    expect(mocks.authService.generateTokens).toHaveBeenCalledWith(
      containing({
        userId: USER_ID,
        roleId: ROLE_ID,
        deviceId: DEVICE_ID,
      }),
    );
  });
});
