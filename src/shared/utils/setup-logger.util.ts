import { type IncomingMessage, type ServerResponse } from "http";

import { type Params } from "nestjs-pino";
import { GenReqId, Options, ReqId } from "pino-http";
import { v4 as uuidv4 } from "uuid";

import { AppConfigService } from "../services/app-config.service";

const redactPaths = [
  "req.headers.authorization",
  "req.body.token",
  "req.body.email",
  "req.body.phoneNumber",
  "req.body.password",
  "req.body.oldPassword",
  "req.body.newPassword",
];

const customSuccessMessage = (
  req: IncomingMessage,
  res: ServerResponse,
  responseTime: number,
) => {
  return `[${(req.id as string) || "*"}] "${req.method} ${req.url}" ${res.statusCode} - "${req.headers["host"]}" "${req.headers["user-agent"]}" - ${responseTime} ms`;
};

const customReceivedMessage = (req: IncomingMessage) => {
  return `[${(req.id as string) || "*"}] "${req.method} ${req.url}"`;
};

const customErrorMessage = (
  req: IncomingMessage,
  res: ServerResponse,
  err: Error,
) => {
  return `[${(req.id as string) || "*"}] "${req.method} ${req.url}" ${res.statusCode} - "${req.headers["host"]}" "${req.headers["user-agent"]}" - message: ${err.message}`;
};

const genReqId: GenReqId = (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
) => {
  const id: ReqId = req.headers["x-request-id"] || uuidv4();

  res.setHeader("X-Request-Id", id as string);

  return id;
};

function localLoggingConfig(): Options {
  return {
    messageKey: "msg",
    transport: {
      target: "pino-pretty",
      options: {
        singleLine: true,
        ignore:
          "req.id,req.method,req.url,req.headers,req.remoteAddress,req.remotePort,res.headers",
      },
    },
  };
}

export const loggerFactory = (configService: AppConfigService): Params => {
  const logPretty = configService.appConfig.logPretty;
  const logLevel = configService.appConfig.logLevel;

  return {
    pinoHttp: {
      level: logLevel,
      genReqId,
      customSuccessMessage,
      customErrorMessage,
      customReceivedMessage,
      redact: {
        paths: redactPaths, // hide sensitive information
        censor: "**GDPR COMPLIANT**",
      }, // Redact sensitive information
      ...(logPretty && localLoggingConfig()),
    },
  };
};
