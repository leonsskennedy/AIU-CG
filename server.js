const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { sql, poolPromise } = require('./database'); // Correct import
const app = express();
const PORT = process.env.PORT || 3000;
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
require('dotenv').config();

// Dialogflow setup
process.env.GOOGLE_APPLICATION_CREDENTIALS = './key.json';
const projectId = 'aiu-cg';
const sessionClient = new dialogflow.SessionsClient();
const sessionId = uuid.v4();

// Helper: send query to Dialogflow
async function detectIntent(text) {
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  const request = {
    session: sessionPath,
    queryInput: {
      text: { text: text, languageCode: 'en' },
    },
  };
  const [response] = await sessionClient.detectIntent(request);
  return response.queryResult;
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Sessions
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));

// Routes - Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/SignUpPage.html', (req, res) => res.sendFile(path.join(__dirname, 'SignUpPage.html')));
app.get('/LogInPage.html', (req, res) => res.sendFile(path.join(__dirname, 'LogInPage.html')));
app.get('/ChatPage.html', (req, res) => res.sendFile(path.join(__dirname, 'ChatPage.html')));

// Signup
app.post('/SignUpPage', async (req, res) => {
  try {
    const pool = await poolPromise;
    const { username, password } = req.body;

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

    if (!usernameRegex.test(username)) {
      return res.status(400).send("Invalid username format.");
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).send("Weak password.");
    }

    const existing = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT Username FROM [Users] WHERE Username = @username');

    if (existing.recordset.length > 0) {
      return res.status(409).send("Username already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .input('isPrivileged', sql.Bit, 1)
      .query('INSERT INTO [Users] (Username, Password, IsPrivileged) VALUES (@username, @password, @isPrivileged)');

    res.status(201).send("Signup successful!");
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send("Signup failed.");
  }
});

// Login
app.post('/LogInPage', async (req, res) => {
  const { username, password } = req.body;
  const pool = await poolPromise;
  const result = await pool.request()
    .input('username', sql.VarChar, username)
    .query('SELECT * FROM Users WHERE Username = @username');

  if (result.recordset.length > 0) {
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.Password);

    if (match) {
      req.session.loggedIn = true;
      req.session.username = user.FullName || user.Username;
      return res.status(200).send("Login successful");
    }
  }

  res.status(401).send("Invalid credentials");
});

// Chat route
app.post('/chat', async (req, res) => {
  const message = req.body.message.toLowerCase();
  const isLoggedIn = req.session.loggedIn === true;
  const username = req.session.username || 'Guest';

  console.log("Session username:", username);

  const protectedIntents = ['GetStudentGrades', 'GPA', 'GetProfileInfo'];

  try {
    if (message === 'welcome') {
      return res.json({ reply: `Hello, ${username}! How can I assist you today?` });
    }

    const dialogflowResponse = await detectIntent(message);
    const intent = dialogflowResponse.intent.displayName;

    if (protectedIntents.includes(intent) && !isLoggedIn) {
      return res.json({ reply: '❌ Access Denied: Please login to access student data.' });
    }

    if (intent === 'GPA') {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('username', sql.VarChar, username)
        .query('SELECT GPA FROM Students WHERE FullName = @username');

      if (result.recordset.length > 0) {
        const GPA = result.recordset[0].GPA;
        return res.json({ reply: `Your GPA is: ${GPA}` });
      } else {
        return res.json({ reply: '❌ No GPA data found.' });
      }
    }

    const fallback = dialogflowResponse.fulfillmentText || "I'm not sure how to help with that yet.";
    res.json({ reply: fallback });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ reply: 'Something went wrong on the server.' });
  }
});

// Webhook route (if needed)
app.post('/webhook', express.json(), async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;
  const username = req.session.username || 'Guest';

  if (intent === 'GPA') {
    try {
      const result = await poolPromise.request()
        .input('username', sql.VarChar, username)
        .query('SELECT GPA FROM Students WHERE FullName = @username');

      if (result.recordset.length > 0) {
        const gpa = result.recordset[0].GPA;
        return res.json({ fulfillmentText: `Your GPA is: ${gpa}` });
      } else {
        return res.json({ fulfillmentText: "No GPA data found." });
      }
    } catch (error) {
      return res.json({ fulfillmentText: "There was an error retrieving your GPA." });
    }
  }

  res.json({ fulfillmentText: "I'm not sure how to help with that yet." });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
