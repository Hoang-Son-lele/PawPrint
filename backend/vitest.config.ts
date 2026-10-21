import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // env giả để import app trong test (không kết nối DB/Cloudinary thật)
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://test:test@127.0.0.1:4000/pawprint_test',
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-123',
      CLOUDINARY_CLOUD_NAME: 'test',
      CLOUDINARY_API_KEY: 'test',
      CLOUDINARY_API_SECRET: 'test',
      JOBS_ENABLED: 'false',
    },
  },
});
