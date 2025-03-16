const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/chat', (req, res) => {
    const userMessage = req.body.message;
    // Here you can add logic to handle different user messages
    const botResponse = `This is a response to: ${userMessage}`;
    res.json({ response: botResponse });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 