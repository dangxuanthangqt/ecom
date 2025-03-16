export type AppConfig = {
  readonly appEnv: string;
  readonly port: number;
  readonly logLevel: string;
  readonly logPretty: boolean;
  readonly accessTokenConfig: JwtConfig;
  readonly refreshTokenConfig: JwtConfig;
  readonly otpExpiresIn: string;
  readonly resendApiKey: string;
  readonly sandboxEmail?: string;
};

export type JwtConfig = {
  readonly secretKey: string;
  readonly expiresIn: string;
};
