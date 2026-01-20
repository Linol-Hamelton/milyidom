import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request, {
  type SuperTest,
  type SuperTestStatic,
  type Test as SuperTestRequest,
} from 'supertest';
import { AppModule } from '../src/app.module';

const supertestFactory: SuperTestStatic = request;

function assertIsHttpServer(instance: unknown): asserts instance is Server {
  if (
    typeof instance !== 'object' ||
    instance === null ||
    typeof (instance as Server).listen !== 'function'
  ) {
    throw new Error('Expected HTTP server instance');
  }
}

function assertIsSuperTest(
  value: unknown,
): asserts value is SuperTest<SuperTestRequest> {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { get?: unknown }).get !== 'function'
  ) {
    throw new Error('Expected supertest client');
  }
}

function createSuperTest(server: Server): SuperTest<SuperTestRequest> {
  const instance: unknown = supertestFactory(server);
  assertIsSuperTest(instance);
  return instance;
}

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let http: SuperTest<SuperTestRequest>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    const httpServer: unknown = app.getHttpServer();
    assertIsHttpServer(httpServer);
    http = createSuperTest(httpServer);
  });

  it('/ (GET)', async () => {
    const response = await http.get('/').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        name: 'Milyi Dom API',
        status: 'ok',
      }),
    );
  });
});
