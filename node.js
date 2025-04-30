const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

// Load your Service Account credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = './key.json'; // <-- your JSON key path

// Initialize Dialogflow client
const sessionClient = new dialogflow.SessionsClient();

/*async function testDialogflowConnection() {
  const sessionPath = sessionClient.projectAgentSessionPath('univbot-458117', uuid.v4());*/

async function detectIntent(projectId = '', sessionId = uuid.v4(), query = 'What is my GPA?') {
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: 'Hello',
        languageCode: 'en',
      },
    },
  };

  try {
    const [response] = await sessionClient.detectIntent(request); // response is an array
    const result = response.queryResult; // queryResult is in the response

    console.log(`Query Text: ${result.queryText}`);
    console.log(`Detected Intent: ${result.intent.displayName}`);
    console.log(`Response: ${result.fulfillmentText}`);
  } catch (error) {
    console.error('Error detecting intent:', error);
  }
}
detectIntent('', uuid.v4(), 'what is my GPA')
  .catch(console.error);

