const express = require('express');
const sql = require('mssql');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { poolPromise } = require('./db');
const dialogflow = require('@google-cloud/dialogflow');
process.env.GOOGLE_APPLICATION_CREDENTIALS = './jasonkey.json';
//const sessionClient = new dialogflow.SessionsClient();
const uuid = require('uuid');
require('dotenv').config(); // Load environment variables

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Dialogflow client setup
const projectId = 'univbot-458117';  // Replace with your Dialogflow project ID
const sessionClient = new dialogflow.SessionsClient();
const sessionId = uuid.v4();  // Unique session ID for each user

// Helper function to send a query to Dialogflow
async function detectIntent(text) {
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: text,
        languageCode: 'en',
      },
    },
  };

  try {
    const [response] = await sessionClient.detectIntent(request);
    return response.queryResult;
  } catch (err) {
    console.error('Dialogflow detectIntent error: ', err);
    throw new Error('Dialogflow API error: ' + err.message);
  }
}

// Routes
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(__dirname + '/public/login.html'));
app.get('/signup', (req, res) => res.sendFile(__dirname + '/public/signup.html'));
app.get('/chat', (req, res) => res.sendFile(__dirname + '/public/chat.html'));

// SignUp route
app.post('/signup', async (req, res) => {
  const { username, password, email, role } = req.body;
  const hash = bcrypt.hashSync(password, 8);
  try {
    const db = await poolPromise;
    await db.request()
      .input('username', username)
      .input('password_hash', hash)
      .input('email', email)
      .input('role', role)
      .query('INSERT INTO Users (username, password_hash, email, role) VALUES (@username, @password_hash, @email, @role)');
    res.redirect('/login');
  } catch (err) {
    res.send("Signup error: " + err.message);
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const pool = await poolPromise;
    if (!pool) {
      console.error('❌ No DB connection in login route');
      return res.status(500).send('Database connection not available.');
    }

    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT * FROM users WHERE username = @username');

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      const passwordMatch = bcrypt.compareSync(password, user.password_hash);

      if (passwordMatch) {
        req.session.loggedIn = true;
        req.session.username = user.username; 
        console.log(`✅ Login success for user: ${username}`);
        return res.redirect('/chat.html');
      }


    }

    console.log(`❌ Login failed for user: ${username}`);
    res.send('Login failed. Invalid username or password.');
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).send('Internal server error during login.');
  }
});

// Chat route: Use Dialogflow to process user messages
app.post('/chat', async (req, res) => {
  const message = req.body.message.toLowerCase();
  const isLoggedIn = req.session.loggedIn === true;
  console.log("login",isLoggedIn);
  const username = req.session.username || 'Guest';

  const protectedIntents = ['GetStudentGrades', 'GPA', 'GetProfileInfo'];

  try {
    if (message === 'welcome') {
      return res.json({ reply: `Hello, ${username}! How can I assist you today?` });
    }

    const dialogflowResponse = await detectIntent(message);
    const intent = dialogflowResponse.intent.displayName;

    console.log('Detected intent:', intent);  // Debugging line

    if (protectedIntents.includes(intent)) {
      if (!isLoggedIn) {
        return res.json({ reply: '❌ Access Denied: Please login to access student data.' });
      }
    }

    if (intent === 'GPA') {
      // Fetch GPA from database for the logged-in user
      const pool = await poolPromise;  // Ensure the DB connection is established
      const result = await pool.request().input('username', sql.VarChar, username).query('SELECT gpa FROM Students WHERE name = @username');
      console.log('Detected intent:', intent); 
      // Log the result to see the database response
      console.log('Database result:', result.recordset);

      if (result.recordset.length > 0) {
        const gpa = result.recordset[0].gpa;
        console.log(`Retrieved GPA for ${username}: ${gpa}`);  // Print the GPA to the console
        return res.json({ reply: `Your GPA is: ${gpa}` });
      } else {
        console.log(`No GPA found for ${username}`);
        return res.json({ reply: '❌ No GPA data found.' });
      }
    }

    res.json({ reply: dialogflowResponse.fulfillmentText });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ reply: 'Something went wrong on the server.' });
  }
});



// Webhook route to handle Dialogflow requests
app.post('/webhook', express.json(), async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;
  const parameters = req.body.queryResult.parameters;
  const username = req.session.username || 'Guest'; // Default to 'Guest' if not logged in

  console.log('Received intent:', intent);
  console.log('Username:', username);

  if (intent === 'GPA') {
    try {
      // Query the database to fetch GPA for the logged-in user
      const result = await poolPromise.request()
        .input('username', sql.VarChar, username)
        .query('SELECT gpa FROM Students WHERE name = @username');
      
      console.log('Database query result:', result);

      if (result.recordset.length > 0) {
        // GPA found, respond with the GPA
        const gpa = result.recordset[0].gpa;
        console.log(`Found GPA: ${gpa}`);
        return res.json({ fulfillmentText: `Your GPA is: ${gpa}` });
      } else {
        // No GPA found for the user
        console.log('No GPA found for the user');
        return res.json({ fulfillmentText: "Sorry, no GPA found for you." });
      }
    } catch (error) {
      console.error('Webhook GPA error:', error);
      return res.json({ fulfillmentText: "There was an error retrieving your GPA." });
    }
  } else {
    return res.json({ fulfillmentText: "I'm not sure how to handle that yet." });
  }
});



// Start the server
app.listen(3001, () => console.log("Server running at http://localhost:3001"));
