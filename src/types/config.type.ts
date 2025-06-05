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

  // Google
  readonly googleClientId: string;
  readonly googleClientSecret: string;
  readonly googleRedirectUri: string;
  readonly googleRedirectClientUri: string;

  // S3
  readonly s3Region: string;
  readonly s3AccessKey: string;
  readonly s3SecretKey: string;
  readonly s3BucketName: string;
};

export type JwtConfig = {
  readonly secretKey: string;
  readonly expiresIn: string;
};
