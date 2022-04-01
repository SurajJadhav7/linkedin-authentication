const express = require('express');
const cors = require('cors');
const app = express();
const axios = require('axios');
const qs = require('query-string');
const dotenv = require('dotenv');
dotenv.config();
app.use(cors());

// Constand
const urlToGetLinkedInAccessToken = 'https://www.linkedin.com/oauth/v2/accessToken';
const urlToGetUserProfile ='https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~digitalmediaAsset:playableStreams))'
const urlToGetUserEmail = 'https://api.linkedin.com/v2/clientAwareMemberHandles?q=members&projection=(elements*(primary,type,handle~))';

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

app.get('/success', async (req, res) => {
  if ('error' in req.query) {
    if (req.query.error === 'user_cancelled_authorize' || req.query.error === 'user_cancelled_login') {
      res.status(401).json({ "error" : "User cancelled login or authorize" });
    } else {
      res.status(500).json({ "error" : "Something went wrong" });
    }
  }
  var user = {};
  const code = req.query.code;
  const accessToken = await getAccessToken(code);
  const userProfile = await getUserProfile(accessToken);
  const userEmail = await getUserEmail(accessToken);
  let resStatus = 400;
  if(!(accessToken === null || userProfile === null || userEmail === null)) {
    user = userBuilder(userProfile, userEmail);
    resStatus = 200;
  }
  res.status(resStatus).json({ user });
})

async function getAccessToken(code) {
  let accessToken = null;
  const config = {
    headers: { "Content-Type": 'application/x-www-form-urlencoded' }
  };
  const parameters = {
    "grant_type": "authorization_code",
    "code": code,
    "redirect_uri": process.env.REDIRECT_URI,
    "client_id": process.env.CLIENT_ID,
    "client_secret": process.env.CLIENT_SECRET,
  };
  await axios
    .post(
      urlToGetLinkedInAccessToken,
      qs.stringify(parameters),
      config)
    .then(response => {
      accessToken = response.data.access_token;
    })
    .catch(err => {
      console.log("Error getting LinkedIn access token", err.response);
    })
    return accessToken;
}

async function getUserProfile(accessToken) {
  let userProfile = {};
  const config = {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  }
  await axios
    .get(urlToGetUserProfile, config)
    .then(response => {
      userProfile.firstName = response.data["localizedFirstName"];
      userProfile.lastName = response.data["localizedLastName"];
      userProfile.profileImageURL = response.data.profilePicture["displayImage~"].elements[0].identifiers[0].identifier;
    })
    .catch(error => console.log("Error grabbing user profile"))
  return userProfile;
}

async function getUserEmail(accessToken) {
  var email = null;
  const config = {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  };
  await axios
    .get(urlToGetUserEmail, config)
    .then(response => {
      email = response.data.elements[0]["handle~"];
    })
    .catch(error => console.log("Error getting user email"))

  return email;
}

function userBuilder(userProfile, userEmail) {
  return {
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    profileImageURL: userProfile.profileImageURL,
    email: userEmail
  }
}

app.listen(3000, function () {
  console.log(`Node server running...`)
});