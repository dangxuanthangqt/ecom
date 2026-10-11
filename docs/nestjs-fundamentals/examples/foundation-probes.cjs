// Run from the repository: node docs/nestjs-fundamentals/examples/foundation-probes.cjs
const assert = require("node:assert/strict");

const ts = require("typescript");

// Compile real legacy TypeScript decorators with the same metadata flags as the repo.
const source = `
import "reflect-metadata";
import { Body, Catch, Controller, Get, Injectable, Module, Post, Req, Res,
  ValidationPipe, createParamDecorator, BadRequestException, ClassSerializerInterceptor } from "@nestjs/common";
import { APP_GUARD, NestFactory, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { IsInt, IsString } from "class-validator";
import { Expose, Type } from "class-transformer";
import { map } from "rxjs/operators";
import request from "supertest";

export async function run(assert: any) {
  let count = 0;
  const probe = async (label: string, fn: () => Promise<void>) => {
    await fn(); count++; console.log("PASS " + label);
  };
  const withApp = async (moduleRef: any, setup: any, check: any) => {
    const app = moduleRef.createNestApplication({ logger: false });
    try { if (setup) setup(app); await app.init(); await check(app); }
    finally { await app.close(); }
  };

  await probe("missing Injectable can boot with undefined dependencies", async () => {
    @Injectable() class Dependency {}
    class Bare { constructor(public dep: Dependency) {} }
    assert.equal(Reflect.getMetadata("design:paramtypes", Bare), undefined);
    const ref = await Test.createTestingModule({ providers: [Dependency, Bare] }).compile();
    try { assert.equal(ref.get(Bare).dep, undefined); } finally { await ref.close(); }
  });

  await probe("transform false still applies Type conversion for DTO validation", async () => {
    class Pagination { @Type(() => Number) @IsInt() page: number; }
    const meta = {type: "query" as const, metatype: Pagination};
    const out = await new ValidationPipe({transform: false}).transform({page: "10"}, meta);
    assert.equal(out.page, "10");
    assert.equal(out instanceof Pagination, false);
    await assert.rejects(new ValidationPipe({transform: false}).transform({page: "oops"}, meta),
      (error: any) => error.getStatus() === 400);
  });

  await probe("custom decorators are skipped unless validation is enabled", async () => {
    class Payload { @IsString() name: string; }
    const meta = { type: "custom" as const, metatype: Payload };
    assert.deepEqual(await new ValidationPipe().transform({name: 123}, meta), {name: 123});
    await assert.rejects(new ValidationPipe({ validateCustomDecorators: true }).transform({name: 123}, meta),
      (error: any) => error.getStatus() === 400);
    const ReadPayload = createParamDecorator(() => ({name: 123}));
    @Controller("custom") class CustomController {
      @Get() read(@ReadPayload() input: Payload) { return input; }
    }
    const ref = await Test.createTestingModule({controllers: [CustomController]}).compile();
    await withApp(ref, (app: any) => app.useGlobalPipes(new ValidationPipe()), async (app: any) => {
      await request(app.getHttpServer()).get("/custom").expect(200, {name: 123});
    });
  });

  @Injectable() class DenyGuard { canActivate() { return false; } }
  @Controller("ping") class PingController { @Get() ping() { return {ok: true}; } }
  await probe("overrideGuard does not replace APP_GUARD/useClass", async () => {
    const ref = await Test.createTestingModule({controllers: [PingController],
      providers: [{provide: APP_GUARD, useClass: DenyGuard}]})
      .overrideGuard(DenyGuard).useValue({canActivate: () => true}).compile();
    await withApp(ref, null, async (app: any) => {
      await request(app.getHttpServer()).get("/ping").expect(403);
    });
  });
  await probe("overrideProvider replaces APP_GUARD/useExisting", async () => {
    const ref = await Test.createTestingModule({controllers: [PingController],
      providers: [DenyGuard, {provide: APP_GUARD, useExisting: DenyGuard}]})
      .overrideProvider(DenyGuard).useValue({canActivate: () => true}).compile();
    await withApp(ref, null, async (app: any) => {
      await request(app.getHttpServer()).get("/ping").expect(200);
    });
  });

  await probe("app.use errors before init reach the global filter", async () => {
    @Catch() class ProbeFilter {
      catch(error: any, host: any) {
        host.switchToHttp().getResponse().status(error.getStatus?.() ?? 500)
          .json({envelope: true, message: error.message});
      }
    }
    const ref = await Test.createTestingModule({controllers: [PingController]}).compile();
    await withApp(ref, (app: any) => {
      app.useGlobalFilters(new ProbeFilter());
      app.use(() => { throw new BadRequestException("app.use boom"); });
    }, async (app: any) => {
      await request(app.getHttpServer()).get("/ping").expect(400, {envelope: true, message: "app.use boom"});
    });
  });

  await probe("ValidationPipe transforms handler argument without replacing req.body", async () => {
    class Payload { @Type(() => Number) page: number; }
    @Controller("dto") class DtoController {
      @Post() read(@Body() arg: Payload, @Req() req: any) {
        return {argIsDto: arg instanceof Payload, argPage: typeof arg.page,
          bodyIsDto: req.body instanceof Payload, bodyPage: typeof req.body.page};
      }
    }
    const ref = await Test.createTestingModule({controllers: [DtoController]}).compile();
    await withApp(ref, (app: any) => app.useGlobalPipes(new ValidationPipe({transform: true})), async (app: any) => {
      await request(app.getHttpServer()).post("/dto").send({page: "10"}).expect(201, {
        argIsDto: true, argPage: "number", bodyIsDto: false, bodyPage: "string"});
    });
  });

  await probe("Res sends its own body but outbound interceptor still runs", async () => {
    let mapped = 0;
    class Wrapper {
      intercept(_ctx: any, next: any) {
        return next.handle().pipe(map((value: any) => { mapped++; return {wrapped: value}; }));
      }
    }
    @Controller("manual") class ManualController {
      @Get() read(@Res() res: any) { res.json({wire: true}); return {returned: true}; }
    }
    const ref = await Test.createTestingModule({controllers: [ManualController]}).compile();
    await withApp(ref, (app: any) => app.useGlobalInterceptors(new Wrapper()), async (app: any) => {
      await request(app.getHttpServer()).get("/manual").expect(200, {wire: true});
      assert.equal(mapped, 1);
    });
  });

  await probe("cache outside serializer stores only the serialized response", async () => {
    class SecretDto { @Expose() name = "public"; password = "hash"; }
    @Controller("cache") class CacheController { @Get() read() { return new SecretDto(); } }
    for (const cacheOutside of [true, false]) {
      let cached: any;
      class CacheProbe {
        intercept(_ctx: any, next: any) {
          return next.handle().pipe(map((value: any) => { cached = value; return value; }));
        }
      }
      const cache = new CacheProbe();
      const serializer = new ClassSerializerInterceptor(new Reflector(), {excludeExtraneousValues: true});
      const ref = await Test.createTestingModule({controllers: [CacheController]}).compile();
      await withApp(ref, (app: any) => app.useGlobalInterceptors(...(cacheOutside ? [cache, serializer] : [serializer, cache])),
        async (app: any) => {
          await request(app.getHttpServer()).get("/cache").expect(200, {name: "public"});
          if (cacheOutside) assert.deepEqual(cached, {name: "public"});
          else assert.equal(cached.password, "hash");
        });
    }
  });

  await probe("imports must re-export a module rather than a foreign provider", async () => {
    @Injectable() class Storage {}
    @Module({providers: [Storage], exports: [Storage]}) class StorageModule {}
    @Module({imports: [StorageModule], exports: [Storage]}) class BadModule {}
    await assert.rejects(Test.createTestingModule({imports: [BadModule]}).compile(),
      (error: any) => error.constructor.name === "UnknownExportException");
    @Module({imports: [StorageModule], exports: [StorageModule]}) class GoodModule {}
    @Injectable() class Consumer { constructor(public storage: Storage) {} }
    const ref = await Test.createTestingModule({imports: [GoodModule], providers: [Consumer]}).compile();
    try { assert.ok(ref.get(Consumer).storage instanceof Storage); } finally { await ref.close(); }
  });

  await probe("create constructs providers; init and close await lifecycle hooks", async () => {
    const events: string[] = [];
    @Injectable() class Hooks {
      constructor() { events.push("constructor"); }
      onModuleInit() { events.push("init"); }
      onApplicationBootstrap() { events.push("bootstrap"); }
      async onModuleDestroy() { await Promise.resolve(); events.push("destroy"); }
    }
    @Module({providers: [Hooks]}) class HooksModule {}
    const app = await NestFactory.create(HooksModule, {logger: false, abortOnError: false});
    try {
      assert.deepEqual(events, ["constructor"]);
      await app.init(); await app.init();
      assert.deepEqual(events, ["constructor", "init", "bootstrap"]);
    } finally { await app.close(); }
    assert.deepEqual(events, ["constructor", "init", "bootstrap", "destroy"]);
  });
  console.log(count + " foundation probes passed; no DB/Redis required.");
}
`;
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2021,
    module: ts.ModuleKind.CommonJS,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    esModuleInterop: true,
  },
});
const compiled = { exports: {} };
new Function("require", "module", "exports", outputText)(
  require,
  compiled,
  compiled.exports,
);
compiled.exports.run(assert).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
