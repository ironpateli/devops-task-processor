const request = require('supertest');
const app = require('../server');

describe('API Health Monitoring Endpoints', () => {
  it('GET /apis should return list of APIs', async () => {
    const res = await request(app).get('/apis');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('POST /apis should add a new API', async () => {
    const newApi = {
      name: 'Test API',
      url: 'https://httpbin.org/get'
    };
    const res = await request(app).post('/apis').send(newApi);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toEqual(newApi.name);
    expect(res.body.url).toEqual(newApi.url);
  });

  it('POST /apis should return 400 if name or url is missing', async () => {
    const res = await request(app).post('/apis').send({ name: 'Incomplete API' });
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /status should return health status of APIs', async () => {
    // Increase timeout since it makes actual network requests
    const res = await request(app).get('/status');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('status');
      expect(['UP', 'DOWN']).toContain(res.body[0].status);
      expect(res.body[0]).toHaveProperty('responseTime');
    }
  }, 10000);
});
