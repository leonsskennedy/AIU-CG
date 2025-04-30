const sql = require("mssql");

// MSSQL Configuration
const config = {
    user: "sa3",             // Your SQL Server username (e.g., "sa")
    password: "aiu123", // Your SQL Server password
    server: "localhost",      // Your SQL Server address
    database: "aiucg",   // Your database name
    options: {
        encrypt: false,        // Set to false for local connections
        trustServerCertificate: true, // Change to true for local dev / self-signed certs
    },
};
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => console.log('Database Connection Failed:', err));

module.exports = {
  sql, poolPromise
};