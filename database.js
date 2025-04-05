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

// Function to connect to the database and return the pool
async function connectToDatabase() {
    try {
        const pool = await sql.connect(config);
        console.log("Connected to MSSQL");
        
        // Create Users table if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                Username NVARCHAR(50) NOT NULL UNIQUE,
                Password NVARCHAR(255) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        
        console.log("Users table checked/created successfully");
        return pool;
    } catch (err) {
        console.error("Database connection error:", err);
        throw err; // Re-throw the error to be handled by the caller
    }
}

module.exports = connectToDatabase;
