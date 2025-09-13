import TurboAssetServer from '../src/index';

describe('Turbo Asset Server', () => {
  let server: TurboAssetServer;

  beforeAll(async () => {
    server = new TurboAssetServer();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  test('Server should be defined', () => {
    expect(server).toBeDefined();
  });

  test('Server should have expected properties', () => {
    expect(server).toHaveProperty('start');
    expect(server).toHaveProperty('stop');
  });
});