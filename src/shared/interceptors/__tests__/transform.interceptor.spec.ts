import { firstValueFrom } from "rxjs";

import { TransformInterceptor } from "../transform.interceptor";

import {
  makeCallHandler,
  makeInterceptorExecutionContext,
  TransformedResponse,
} from "./interceptor-test-harness";

describe("TransformInterceptor - intercept", () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it("wraps response data in object with data and statusCode properties", async () => {
    // Arrange
    const responseData = { id: 1, name: "Test" };
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result).toEqual({
      data: responseData,
      statusCode: 200,
    });
  });

  it("calls next.handle() to process the request", async () => {
    // Arrange
    const responseData = { test: "data" };
    const context = makeInterceptorExecutionContext();
    const { handler, handle } = makeCallHandler(responseData);

    // Act
    await firstValueFrom(interceptor.intercept(context, handler));

    // Assert
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it("preserves the original data in the data property", async () => {
    // Arrange
    const responseData = { id: 1, email: "user@example.com" };
    const context = makeInterceptorExecutionContext();
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toBe(responseData);
  });

  it("includes 200 status code in response", async () => {
    // Arrange
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler({ result: "success" });

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<any>;

    // Assert
    expect(result.statusCode).toBe(200);
  });

  it("includes 201 status code in response", async () => {
    // Arrange
    const context = makeInterceptorExecutionContext(201);
    const { handler } = makeCallHandler({ created: true });

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<any>;

    // Assert
    expect(result.statusCode).toBe(201);
  });

  it("includes 400 status code in response", async () => {
    // Arrange
    const context = makeInterceptorExecutionContext(400);
    const { handler } = makeCallHandler({ error: "Bad request" });

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<any>;

    // Assert
    expect(result.statusCode).toBe(400);
  });

  it("includes 404 status code in response", async () => {
    // Arrange
    const context = makeInterceptorExecutionContext(404);
    const { handler } = makeCallHandler(null);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<any>;

    // Assert
    expect(result.statusCode).toBe(404);
  });

  it("includes 500 status code in response", async () => {
    // Arrange
    const context = makeInterceptorExecutionContext(500);
    const { handler } = makeCallHandler({ error: "Internal server error" });

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<any>;

    // Assert
    expect(result.statusCode).toBe(500);
  });

  it("handles array response data", async () => {
    // Arrange
    const responseData = [{ id: 1 }, { id: 2 }];
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toEqual(responseData);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("handles string response data", async () => {
    // Arrange
    const responseData = "String response";
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toBe(responseData);
  });

  it("handles null response data", async () => {
    // Arrange
    const responseData = null;
    const context = makeInterceptorExecutionContext(204);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toBeNull();
  });

  it("handles undefined response data", async () => {
    // Arrange
    const responseData = undefined;
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toBeUndefined();
  });

  it("handles numeric response data", async () => {
    // Arrange
    const responseData = 42;
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toBe(42);
  });

  it("handles boolean response data", async () => {
    // Arrange
    const responseData = true;
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result.data).toBe(true);
  });

  it("returns an Observable", () => {
    // Arrange
    const context = makeInterceptorExecutionContext();
    const { handler } = makeCallHandler({ test: "data" });

    // Act
    const result$ = interceptor.intercept(context, handler);

    // Assert
    expect(result$).toHaveProperty("subscribe");
    expect(typeof result$.subscribe).toBe("function");
  });

  it("multiple subscribers receive the same transformed data", async () => {
    // Arrange
    const responseData = { value: "test" };
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result1 = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;
    const result2 = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result1).toEqual(result2);
    expect(result1.data).toEqual(responseData);
    expect(result2.data).toEqual(responseData);
  });

  it("includes both data and statusCode in the transformed response", async () => {
    // Arrange
    const responseData = { message: "success" };
    const context = makeInterceptorExecutionContext(201);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(Object.keys(result)).toContain("data");
    expect(Object.keys(result)).toContain("statusCode");
  });

  it("does not modify the original handler call", async () => {
    // Arrange
    const responseData = { id: 1 };
    const context = makeInterceptorExecutionContext();
    const { handler, handle } = makeCallHandler(responseData);

    // Act
    await firstValueFrom(interceptor.intercept(context, handler));

    // Assert
    expect(handle).toHaveBeenCalledWith();
  });

  it("applies map operator to transform the response", async () => {
    // Arrange
    const responseData = { original: "data" };
    const context = makeInterceptorExecutionContext(200);
    const { handler } = makeCallHandler(responseData);

    // Act
    const result$ = interceptor.intercept(context, handler);
    const result = (await firstValueFrom(result$)) as TransformedResponse<
      typeof responseData
    >;

    // Assert
    expect(result).not.toBe(responseData);
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("statusCode");
  });
});
