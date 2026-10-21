import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/middlewares/auth';

const app = createApp();

describe('HTTP smoke (không cần DB)', () => {
  it('blocks protected routes without a token', async () => {
    const res = await request(app).get('/api/v1/pets');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/v1/pets').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('validates register payload', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('validates path params before hitting the DB', async () => {
    const token = signAccessToken({ id: '00000000-0000-4000-8000-000000000000', role: 'USER' });
    const res = await request(app).get('/api/v1/pets/not-a-uuid').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires explicit confirmation to delete a pet', async () => {
    const token = signAccessToken({ id: '00000000-0000-4000-8000-000000000000', role: 'USER' });
    const res = await request(app)
      .delete('/api/v1/pets/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns JSON error for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/v1/pets');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
