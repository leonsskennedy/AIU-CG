const express = require("express");
const bodyParser = require("body-parser");
const connectToDatabase = require("./database"); // Import the MySQL connection
const sql = require("mssql"); // Import sql from the mssql package
const path = require("path"); // Import path module for handling file paths
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the signup page (GET request for `/`)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/AIU-CG', (req, res) => {
    res.sendFile(__dirname + '/testsignup.html'); // Path to your signup.html
});

// Serve the signup page
app.get('/SignUpPage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'SignUpPage.html'));
});

// Serve the login page
app.get('/LoginPage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'LogInPage.html'));
});

// Serve the chat page
app.get('/ChatPage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ChatPage.html'));
});

// Signup Route
app.post('/testsignup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Connect to SQL Server and get the pool
        const pool = await connectToDatabase();

        // Insert data into the userdb table
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query('INSERT INTO [user] (username, email, password) VALUES (@username, @email, @password)');

        console.log("User registered:", result);
        res.send("Signup successful!");
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).send(`Signup failed! Error: ${err.message}`);
    }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

