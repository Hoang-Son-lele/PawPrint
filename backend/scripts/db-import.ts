/**
 * Import database/pawprint_tidb.sql vào TiDB bằng DATABASE_URL trong .env
 *   npm run db:import
 *
 * TLS: TiDB Cloud dùng chứng chỉ Let's Encrypt (ISRG Root X1) có sẵn trong CA bundle của Node.
 * Nếu cần CA riêng (TiDB self-hosted), đặt DB_SSL_CA=<đường dẫn file .pem>.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('Thiếu DATABASE_URL trong .env');
  const url = new URL(raw);

  const useTls = url.searchParams.has('sslaccept') || url.hostname.endsWith('tidbcloud.com');
  const caPath = process.env.DB_SSL_CA;

  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: true,
    ssl: useTls
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: true, ...(caPath && { ca: readFileSync(caPath) }) }
      : undefined,
  });

  const [[version]] = (await conn.query('SELECT VERSION() AS v')) as unknown as [[{ v: string }]];
  console.log(`✅ Kết nối thành công: ${url.hostname} – ${version.v}`);

  const sqlFile = path.resolve(__dirname, '../../database/pawprint_tidb.sql');
  const sql = readFileSync(sqlFile, 'utf8');
  console.log(`⏳ Đang import ${path.basename(sqlFile)} ...`);
  await conn.query(sql);

  const [tables] = (await conn.query(
    `SELECT TABLE_NAME AS name, TABLE_COMMENT AS comment
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'pawprint' ORDER BY TABLE_NAME`,
  )) as unknown as [{ name: string; comment: string }[]];
  console.log(`✅ Database 'pawprint' có ${tables.length} bảng:`);
  for (const t of tables) console.log(`   - ${t.name.padEnd(24)} ${t.comment}`);

  const [plans] = (await conn.query('SELECT id, name, price FROM pawprint.plans')) as unknown as [
    { id: string; name: string; price: string }[],
  ];
  console.log('✅ Seed plans:', plans.map((p) => `${p.id} (${p.price})`).join(', '));

  await conn.end();
}

main().catch((err) => {
  console.error('❌ Import thất bại:', err.message);
  process.exit(1);
});
