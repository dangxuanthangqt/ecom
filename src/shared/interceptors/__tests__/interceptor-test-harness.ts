import { ServerResponse } from "http";

import { ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

export interface TransformedResponse<T> {
  data: T;
  statusCode: number;
}

export const makeCallHandler = (
  responseData: any,
): { handle: jest.Mock; handleObservable: Observable<any> } => {
  const handleObservable = new Observable((subscriber) => {
    subscriber.next(responseData);
    subscriber.complete();
  });

  return {
    handle: jest.fn().mockReturnValue(handleObservable),
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
