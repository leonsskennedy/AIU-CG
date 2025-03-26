const sql = require("mssql");

// Configuration for SQL Server Express
const config = {
    user: "sa3",             // Your SQL Server username (e.g., "sa")
    password: "aiu123", // Your SQL Server password
    server: "DESKTOP-0QPH76G\SQLEXPRESS",      // SQL Server host (use IP or hostname if not localhost)
    database: "aiucg",   // Your database name
    options: {
        encrypt: true,        // Use encryption (recommended for Azure SQL or secure connections)
        trustServerCertificate: true, // Disable SSL verification (not recommended for production)
    },
};

// Create a pool of connections
async function connectToDatabase() {
    try {
        const pool = await sql.connect(config);
        console.log("Connected to SQL Server!");
        return pool; // Return the pool to be used in other files
    } catch (err) {
        console.error("Error connecting to SQL Server:", err);
        throw err; // Re-throw the error for handling in the caller
    }
}
module.exports = connectToDatabase;
