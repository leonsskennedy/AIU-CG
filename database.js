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
                IsPrivileged BIT NOT NULL DEFAULT 0,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        
        // Create Students table if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Students' AND xtype='U')
            CREATE TABLE Students (
                StudentId INT IDENTITY(1,1) PRIMARY KEY,
                FullName NVARCHAR(100) NOT NULL,
                Email NVARCHAR(100) NOT NULL UNIQUE,
                Major NVARCHAR(50) NOT NULL,
                GPA DECIMAL(3,2) CHECK (GPA >= 0 AND GPA <= 4)
            )
        `);

        // Create Courses table if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Courses' AND xtype='U')
            CREATE TABLE Courses (
                CourseId INT IDENTITY(1,1) PRIMARY KEY,
                CourseName NVARCHAR(100) NOT NULL,
                CourseCode NVARCHAR(20) NOT NULL UNIQUE,
                Instructor NVARCHAR(100) NOT NULL,
                Email NVARCHAR(100) NOT NULL
            )
        `);

        // Create StudentCourses table for tracking enrolled courses
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='StudentCourses' AND xtype='U')
            CREATE TABLE StudentCourses (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                StudentId INT NOT NULL,
                CourseId INT NOT NULL,
                Grade NVARCHAR(2),
                Semester NVARCHAR(20) NOT NULL,
                FOREIGN KEY (StudentId) REFERENCES Students(StudentId),
                FOREIGN KEY (CourseId) REFERENCES Courses(CourseId)
            )
        `);
        
        console.log("Tables checked/created successfully");
        return pool;
    } catch (err) {
        console.error("Database connection error:", err);
        throw err; // Re-throw the error to be handled by the caller
    }
}

module.exports = connectToDatabase;
