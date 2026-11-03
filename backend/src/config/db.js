const sql = require("mssql");
const env = require("./env");

const options = {
  encrypt: env.dbEncrypt,
  trustServerCertificate: env.dbTrustServerCertificate,
  enableArithAbort: true,
};
if (env.dbInstance) options.instanceName = env.dbInstance;

const config = {
  server: env.dbServer,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  options,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};
if (env.dbPort) config.port = Number(env.dbPort);

let poolPromise;
function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config);
    poolPromise = pool.connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
