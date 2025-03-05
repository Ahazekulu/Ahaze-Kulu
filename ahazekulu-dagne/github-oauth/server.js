const express = require('express');
const axios = require('axios');
const app = express();
const port = 9005;

// Replace with your GitHub OAuth App credentials
const CLIENT_ID = '89cf50f02ac6aaed3484';
const CLIENT_SECRET = '7d44ac8d49ff0b575fd5774d5deae96be002bfe4'; // Replace with your actual client secret
const REDIRECT_URI = 'http://localhost:9005/callback';

// Route to handle the callback from GitHub
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;

    if (!code) {
        return res.status(400).send('Error: No code received');
    }

    try {
        // Exchange code for access token
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            redirect_uri: REDIRECT_URI,
            state: state,
        }, {
            headers: {
                Accept: 'application/json',
            },
        });

        const accessToken = response.data.access_token;
        console.log('Access Token:', accessToken);
        res.send('Authentication successful! Check your terminal for the access token.');
    } catch (error) {
        console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});