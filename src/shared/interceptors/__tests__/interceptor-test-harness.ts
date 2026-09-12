import { ServerResponse } from "http";

import { CallHandler, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

export interface TransformedResponse<T> {
  data: T;
  statusCode: number;
}

export const makeCallHandler = (
  responseData: unknown,
): {
  handler: CallHandler;
  handle: jest.Mock<Observable<unknown>, []>;
  handleObservable: Observable<unknown>;
} => {
  const handleObservable = new Observable((subscriber) => {
    subscriber.next(responseData);
    subscriber.complete();
  });

  const handle = jest
    .fn<Observable<unknown>, []>()
    .mockReturnValue(handleObservable);

  return {
    handler: { handle },
    handle,
    handleObservable,
  };
};

export const makeInterceptorExecutionContext = (
  statusCode: number = 200,
): ExecutionContext => {
  const mockResponse = {
    statusCode,
  } as ServerResponse;

  return {
    switchToHttp: jest.fn(() => ({
      getResponse: jest.fn(() => mockResponse),
    })),
  } as unknown as ExecutionContext;
};
