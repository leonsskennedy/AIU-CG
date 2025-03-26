const express = require("express");
const bodyParser = require("body-parser");
const connectToDatabase = require("./database"); // Import the MySQL connection
const sql = require("mssql"); // Import sql from the mssql package
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the signup page (GET request for `/`)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/testsignup.html');
});

app.get('/testsignup', (req, res) => {
    res.sendFile(__dirname + '/testsignup.html'); // Path to your signup.html
});


// Signup Route
app.post("/testsignup", async (req, res) => {
    const { username, email, password } = req.body;

    // Insert user data into MySQL
 //   const sql = "INSERT INTO userdb (username, email, password) VALUES (?, ?, ?)";
  /*  db.query(sql, [username, email, password], (err, result) => {
        if (err) {
            console.error("Error inserting data: " + err);
            res.status(500).send("Signup failed!");
        } else {
            console.log("User registered:", result);
            res.send("Signup successful!");
        }
    });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// JavaScript source code */

    try {
        // Connect to SQL Server and get the pool
        const pool = await connectToDatabase();

        // Insert data into the userdb table
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query('INSERT INTO User (username, email, password) VALUES (@username, @email, @password)');

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
