const isReplit = false;

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fetch = require('@replit/node-fetch');
const querystring = require('querystring'); // Import the 'querystring' library
const Vibrant = require('node-vibrant');
const sharp = require('sharp'); // Import the sharp library
const axios = require('axios');
const cheerio = require('cheerio'); // Include cheerio
const tinycolor = require('tinycolor2');
const serverless = require('serverless-http');
const dotenv = require('dotenv').config();
const { analyzeFullBuffer } = require('realtime-bpm-analyzer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
let audioDecode;
(async () => {
  audioDecode = (await import('audio-decode')).default;
})();
const port = process.env.PORT || 8888;
// Check if the code is running in a Repl.it environment


// Define the base URL for Netlify deployment
const netlifyBaseUrl = 'https://firefly-musical-alien.ngrok-free.app';
const originURL = `${netlifyBaseUrl}`

// Define the base URL for Repl.it deployment
const replitBaseUrl = 'https://bpm-flash-4-spotify-mv47.replit.app';

// Set the redirect URI based on the environment
const redirectUri = isReplit ? `${replitBaseUrl}/callback` : `${originURL}/callback`;

// Now you can use the dynamic redirectUri in your code
console.log('Redirect URI:', redirectUri);
console.log('Built URI:', originURL);

const clientId = process.env.CLIENT_ID_1; // process.env.CLIENT_ID, process.env.CLIENT_ID_1, process.env.CLIENT_ID_2, process.env.CLIENT_ID_3 slej
const clientSecret = process.env.CLIENT_SECRET_1; // process.env.CLIENT_SECRET, process.env.CLIENT_SECRET_1, process.env.CLIENT_SECRET_2, process.env.CLIENT_SECRET_3
let lastLoggedIn;

// Set the CORS options based on the environment
let corsOptions;
if (isReplit) {
    corsOptions = {
        origin: netlifyBaseUrl,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 204,
    };
} else {
    corsOptions = {
        origin: netlifyBaseUrl,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        optionsSuccessStatus: 204,
    };
}

app.use(cors(corsOptions));
app.use(express.static(__dirname + '/pb')).use(cors()).use(cookieParser());
app.use(express.json());

const scope = 'user-read-private user-read-email user-read-currently-playing user-modify-playback-state user-read-playback-state ' +
  'playlist-read-private playlist-modify-private playlist-modify-public playlist-read-collaborative user-top-read user-library-read ' + 
  'user-library-modify ugc-image-upload';


function formatTimestamp(timestamp) {
  const days = Math.floor(timestamp / (3600 * 24));
  const hours = Math.floor((timestamp % (3600 * 24)) / 3600);
  const minutes = Math.floor((timestamp % 3600) / 60);
  const seconds = Math.floor(timestamp % 60);

  return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}

// Function to check if the access token is about to expire
function tokenIsAboutToExpire(expiresIn,lastLoggedIn) {
    const timeDifference = ((Date.now() / 1000) - lastLoggedIn);
    console.log(`${expiresIn-timeDifference} seconds left before expire`  );
    if(isNaN(`${expiresIn-timeDifference}`)){
      return true;
    }
    return expiresIn-timeDifference <= 600; // 300 seconds (5 minutes) buffer before expiration
}


// Function to refresh the access token
async function refreshAccessToken(refreshToken) {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        },
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };

    try {
        const response = await fetch(authOptions.url, {
            method: 'POST',
            body: querystring.stringify(authOptions.form),
            headers: authOptions.headers,
        });

        if (response.status === 200) {
            const data = await response.json();
            console.log('Refreshed access token successfully');
            return data.access_token; // New access token
        } else {
            console.error('1Error refreshing access token:', response.statusText);
            return null;
        }
    } catch (error) {
        console.error('2Error refreshing access token:', error);
        return null;
    }
}

// Middleware to check and refresh the access token
app.use(async (req, res, next) => {
    const access_token = req.cookies.access_token;
    const expires_in = req.cookies.expires_in;
    const last_logged_in = req.cookies.last_logged_in;
  console.log (`INSIDE REFRESH TOKEN - app.use`)
  console.log(tokenIsAboutToExpire(expires_in, last_logged_in));
    if (access_token && tokenIsAboutToExpire(expires_in, last_logged_in)) {
        const refresh_token = req.cookies.refresh_token; // Retrieve your stored refresh token
        const newAccessToken = await refreshAccessToken(refresh_token);

        if (newAccessToken) {
            // Update the access token in your storage
            res.cookie('access_token', newAccessToken);
            req.cookies.access_token = newAccessToken; // Update the request object
            lastLoggedIn= Date.now()/1000;
            res.cookie('last_logged_in', lastLoggedIn);
            req.cookies.last_logged_in = lastLoggedIn; // Update the request object
        }
    }

    next();
});

app.get('/refresh-token', async (req, res) => {
    const access_token = req.cookies.access_token;
    const expires_in = req.cookies.expires_in;
    const last_logged_in = req.cookies.last_logged_in;
    console.log('INSIDE REFRESH TOKEN inside /refresh-token');

    if (access_token && tokenIsAboutToExpire(expires_in,last_logged_in)) {
        const refresh_token = req.cookies.refresh_token;
        const newAccessToken = await refreshAccessToken(refresh_token);

        if (newAccessToken) {
            // Update the access token in your storage
            res.cookie('access_token', newAccessToken);
            req.cookies.access_token = newAccessToken; // Update the request object
            lastLoggedIn= Date.now()/1000;
            res.cookie('last_logged_in', lastLoggedIn);
            req.cookies.last_logged_in = lastLoggedIn; // Update the request object
            
            console.log('Access token refreshed successfully from /refresh-token');
            res.sendStatus(200); // Send a success response
        } else {
            res.sendStatus(500); // Send an error response if token refresh fails
        }
    } else {
        res.sendStatus(200); // If token is still valid, send a success response
    }
});


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/pb/index.html'));
});

app.get('/login', function(req, res) {
    console.log('Login route hit'); // Check if this logs
    const state = generateRandomString(16);
    const showDialog = true;

    const spotifyAuthUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: clientId,
            scope: scope,
            redirect_uri: redirectUri,
            state: state,
            show_dialog: true
        });

    console.log('Redirecting to Spotify login:', spotifyAuthUrl);
    res.redirect(spotifyAuthUrl);
    lastLoggedIn = Date.now() / 1000;
});



app.get('/logout', function(req, res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('expires_in');
  res.clearCookie('last_logged_in');

  // Send a success response and trigger a page reload in the client
  res.status(200).send('You have been logged out. <script>window.location.reload();</script>');
});





app.get('/callback', async function(req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64'))
            },
            json: true
        };

        try {
            const response = await fetch(authOptions.url, {
                method: 'POST',
                body: querystring.stringify(authOptions.form),
                headers: {
                    'Authorization': authOptions.headers.Authorization,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.status === 200) {
                const data = await response.json();
                lastLoggedIn= Date.now()/1000;
                // Now you have the access token and can use it for your API requests
                const access_token = data.access_token;
                // You should also get and store the refresh token here
                const refresh_token = data.refresh_token;
                const expires_in = data.expires_in;
              console.log(`in /callback: expiration `, formatTimestamp(expires_in))
              tokenIsAboutToExpire(expires_in, lastLoggedIn)
                console.log('Access token obtained successfully');
                console.log('Access token:', access_token);
                console.log('Refresh token:', refresh_token);
                console.log('Expires in:', expires_in);

                // Set the access token, refresh token, and expiration time in cookies
                res.cookie('access_token', access_token);
                res.cookie('refresh_token', refresh_token);
                res.cookie('expires_in', expires_in);
                res.cookie('last_logged_in', lastLoggedIn);

                // Redirect to your desired page after authentication
                res.redirect('/');
            } else {
                console.error('Error fetching access token:', response.statusText);
                res.send('Error occurred during authentication.');
            }
        } catch (error) {
            console.error('Error fetching access token:', error);
            res.send('Error occurred during authentication.');
        }
    }
});
// Define a function to print the time difference
function printTimeDifference() {
    const timeDifference = (Date.now() / 1000 - lastLoggedIn);
    console.log(timeDifference);
}



app.listen(port, () => {
  console.log('Server started at port ' + port);
});

// Function to generate a random string
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}


// Updated route to accept the 'url' parameter
app.get('/getColors', async function(req, res) {
  const imageUrl = req.query.url; // Get the 'url' parameter from the query string

  // Fetch the image from the provided URL (you may need to adjust this based on your requirements)
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

try {
  // Define the number of quadrants (e.g., 4 for dividing into four parts)
  const numQuadrants = 4;

  // Get image dimensions
  const { width, height } = await getImageDimensions(imageBuffer);

  // Calculate the dimensions of each quadrant
  const quadrantWidth = Math.floor(width / numQuadrants);
  const quadrantHeight = Math.floor(height / numQuadrants);

  // Initialize an array to store the colors from all quadrants
  const allColors = [];
  const swatchedColors = [];
  
  // Process each quadrant separately
  for (let i = 0; i < numQuadrants; i++) {
    for (let j = 0; j < numQuadrants; j++) {
      // Calculate the coordinates of the current quadrant
      const x1 = i * quadrantWidth;
      const x2 = (i + 1) * quadrantWidth;
      const y1 = j * quadrantHeight;
      const y2 = (j + 1) * quadrantHeight;

      // Crop the image to the current quadrant
      const quadrantBuffer = await cropImage(imageBuffer, x1, y1, x2, y2);

      // Create a Vibrant object with the quadrant image
      const palette = await Vibrant.from(quadrantBuffer).getPalette();
      
      // Extract swatch colors from the quadrant palette
      const swatchColors = Object.values(palette).map(swatch => swatch? swatch.getHex() :null).filter(swatch => swatch !== null);
      // console.log(swatchColors);
      swatchedColors.push(...swatchColors);
      // console.log("Pushed to swatched colors:");
      // console.log(swatchColors);
      // console.log("Colors in swatched colors");
      // console.log(swatchedColors);

      // Filter and add the colors to the allColors array (adjust criteria as needed)
      const filteredColors = swatchColors.filter(color => {
        const [r, g, b] = hexToRgb(color);
        const saturation = calculateSaturation(r, g, b);
        const vibrancy = calculateVibrancy(r, g, b);
        const minSaturation = 0.5;
        const minVibrancy = 0.5;
        return saturation >= minSaturation && vibrancy >= minVibrancy;
      });

      allColors.push(...filteredColors);
    }
  }

  // Randomize the colors
  const randomizedColors = shuffleArray(allColors);

  // Remove similar colors (adjust tolerance as needed, smaller values are more strict)
  const filteredColors = removeSimilarColors(randomizedColors, 35);

  // Check if filteredColors has fewer than 2 colors
  if (filteredColors.length < 2) {
      // Create an array to store the 5 random colors
      const randomColors = [];
      const swatchColors = [...new Set(swatchedColors)];
      // Ensure that randomizedColors has at least 5 colors
      console.log("All unique colors before filtering:");
      console.log(swatchColors);
      if (swatchedColors.length >= 5) {
          // Generate 5 random indices to select colors from randomizedColors
          const randomIndices = [];
          while (randomIndices.length < 5) {
              const randomIndex = Math.floor(Math.random() * swatchColors.length);
              if (!randomIndices.includes(randomIndex)) {
                  randomIndices.push(randomIndex);
              }
          }
  
          // Retrieve the selected random colors and add them to randomColors
          randomIndices.forEach(index => {
              randomColors.push(swatchColors[index]);
          });
            
            // Check if filteredColors is not empty and add its contents to randomColors
            if (filteredColors.length > 0) {
                randomColors.push(...filteredColors);
            }
            // Respond with the selected colors as JSON
            res.json(randomColors);
      } else {
          // Handle the case where randomizedColors has fewer than 5 colors
          console.error("randomizedColors should have at least 5 colors.");
      }
  
      // Now, randomColors contains 5 random colors (if available)
      console.log(randomColors);
  } else{
    // Respond with the selected colors as JSON
    res.json(filteredColors);
  }

  
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ error: 'Error extracting colors' });
}
});

// Function to convert hex color to RGB
function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// Function to calculate saturation of an RGB color
function calculateSaturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  return delta / max;
}

// Function to calculate vibrancy of an RGB color
function calculateVibrancy(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min;
}

// Function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Function to select a darker color
function selectDarkerColor(colors) {
  // You can define your own logic to select a darker color from the array
  // For example, you can sort the colors by brightness and select the darkest one
  // Here, we'll simply select the first color from the array as the darker color
  return colors[0];
}

// Function to select a lighter color
function selectLighterColor(colors) {
  // You can define your own logic to select a lighter color from the array
  // For example, you can sort the colors by brightness and select the lightest one
  // Here, we'll simply select the last color from the array as the lighter color
  return colors[colors.length - 1];
}

// Function to get image dimensions from a buffer
async function getImageDimensions(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    throw error;
  }
}

// Function to crop an image buffer to specified coordinates
async function cropImage(imageBuffer, x1, y1, x2, y2) {
  try {
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 })
      .toBuffer();
    return croppedBuffer;
  } catch (error) {
    console.error('Error cropping image:', error);
    throw error;
  }
}

// Function to remove similar colors from an array
function removeSimilarColors(colors, tolerance = 32) {
  const result = [];

  for (const color of colors) {
    // Convert the color to RGB format
    const rgbColor = hexToRgb(color);

    // Check if the color is different enough from colors already in the result
    const isDifferent = result.every(existingColor => {
      const diff = Math.abs(existingColor[0] - rgbColor[0]) +
        Math.abs(existingColor[1] - rgbColor[1]) +
        Math.abs(existingColor[2] - rgbColor[2]);

      return diff >= tolerance;
    });

    if (isDifferent) {
      result.push(rgbColor);
    }
  }

  // Convert the result back to hex format
  const hexResult = result.map(rgbColor => rgbToHex(...rgbColor));

  return hexResult;
}

// Function to convert RGB values to a hex color
function rgbToHex(r, g, b) {
  const toHex = (value) => {
    const hex = value.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}







// Recursive function to log the structure of Cheerio data
function logCheerioStructure(element, depth = 0) {
    // Log the element's tag name and text
    console.log(' '.repeat(depth * 2) + element.name);

    // Recursively log children
    if (element.children) {
        for (const child of element.children) {
            logCheerioStructure(child, depth + 1);
        }
    }
}


// Function to extract type and name from HTML
function extractTypeAndNameFromHTML(html) {
    const $ = cheerio.load(html.data);
    // console.log("OPEN SPOTIFY RESPONSE\n\n\n\n", html)

    // Extract the title from the <title> tag
    const title = $('title').text();

    // Split the title by '-'
    const titleParts = title.split('-');

    // If there are at least two parts, use them as type and name
    if (titleParts.length >= 2) {
        const type = titleParts[0].trim();
        const name = titleParts.slice(1).join('-').trim();
        return { type, name };
    }

    // If there are not enough parts, return the entire title as the name
    return { type: '', name: title.trim() };
}


app.get('/unshorten-new-spotify-link', async (req, res) => {
    const shortLink = req.query.shortLink;
    console.log('Received shortLink:', shortLink);

    if (
        !shortLink.startsWith('https://spotify.link/') &&
        !shortLink.startsWith('https://spotify.app.link/')
    ) {
      console.log('Not a Spotify link from shortLink', currentURL);
        return res.status(400).json({ error: 'Not a valid Spotify link' });
    }

    // Now proceed with the redirection logic
    let currentURL = decodeURIComponent(shortLink);
    console.log('decoded shortLink:', currentURL);
    try {
        while (true) {
                console.log('Current Link in while loop: ', currentURL);

            const response = await axios.get(currentURL);
            const $ = cheerio.load(response.data);
            // // Log the structure of the entire Cheerio data
            // console.log('Structure of Entire Cheerio Data:');
            // logCheerioStructure($.root()[0], 0);
            // Extract the URL from the HTML
            const extractedURL = $('a.secondary-action').attr('href');
            // console.log('RESPONSE \n\n', response)

            if (response.status >= 200 && response.status < 400 && response.headers) {
                // It's a redirection
                currentURL = extractedURL.split('?')[0];
                console.log('Redirected URL:', currentURL);

                if (currentURL.includes('open.spotify.com/')) {
                    // We've reached the desired URL
                    console.log('Reached the desired URL:', currentURL);
                    const finalPageResponse = await axios.get(shortLink);
                    const { type, name } = extractTypeAndNameFromHTML(finalPageResponse);
                    res.status(200).json({ unshortenedLink: currentURL, type, name });
                    break;
                }
            } else {
                // It's not a redirection, and it's not the desired URL
                console.log('Not a open.spotify.com/ Spotify link ', currentURL);
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});





// Track the primary color and transition
const primaryColors = {};

// Array to store SSE clients
const sseClients = {};

const overlayStorage = {};

// SSE route for secondary to subscribe to color updates
app.get('/subscribe', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { code } = req.query;

    // Send initial color and transition to set the background color based on the code
    const initialColor = primaryColors[code] ? primaryColors[code].color : "#424242";
    const initialTransition = primaryColors[code] ? primaryColors[code].transition : "0s";

    res.write(`data: ${JSON.stringify({ color: initialColor, transition: initialTransition })}\n\n`);

    // Add the client to the list to send updates based on the code
    if (!sseClients[code]) {
        sseClients[code] = [];
    }
    sseClients[code].push(res);

    // Remove the client from the list when the connection is closed
    req.on('close', () => {
        const index = sseClients[code].indexOf(res);
        if (index !== -1) {
            sseClients[code].splice(index, 1);
        }
    });
});

// Function to send color updates to all subscribed clients based on the code
function sendColorUpdate(code, color, transition) {
    if (sseClients[code]) {
        sseClients[code].forEach(client => {
            client.write(`data: ${JSON.stringify({ color, transition })}\n\n`);
        });
    }
}

// Function to update the color and send updates to clients based on the code
function updateColorAndNotify(code, newColor, transition) {
    primaryColors[code] = { color: newColor, transition: transition };
    sendColorUpdate(code, newColor, transition);
}

// Route to update the color from the primary based on the code
app.put('/updateColor/:code/:color/:transition', (req, res) => {
    const { code, color, transition } = req.params;
    updateColorAndNotify(code, color, transition);
    res.send('Color updated successfully');
});


app.post('/saveoverlaydata', express.json(), (req, res) => {
    const { code } = req.query;
    const { overlayHTML } = req.body;

    // console.log('Received overlay data for code', code, ':', overlayHTML);

    if (!overlayStorage[code]) {
        overlayStorage[code] = {};
    }

    overlayStorage[code] = overlayHTML?overlayHTML:'';

    res.status(200).send('Overlay data received successfully');
});



app.get('/getoverlaydata', async (req, res) => {
    const { code } = req.query;

    // console.log('Sending overlay data for code', code, ':', overlayStorage[code]);

    res.status(200).json({ overlayHTML: overlayStorage[code] || {} });
});




app.post('/adjustColors', (req, res) => {
    let colors = req.body.customFlashingColors;
    let saturationChange = req.body.saturationChange;
    let vibranceChange = req.body.vibranceChange;
    let brightnessChange = req.body.brightnessChange;

    // Check if colors is an array
    if (Array.isArray(colors)) {
        let newColors = colors.map(color => {
            let tc = tinycolor(color);
            let currentVibrance = tc.toHsv().v;

            console.log(`Original Color: ${color}`);
            console.log(`Current Vibrance: ${currentVibrance}`);

            // Adjust vibrance in the HSV color space
            if (vibranceChange !== 0) {
                let newVibrance = Math.max(0, Math.min(1, currentVibrance + vibranceChange / 100));
                tc = tinycolor({ h: tc.toHsv().h, s: tc.toHsv().s, v: newVibrance });
                console.log(`New Vibrance: ${newVibrance}`);
            }

            // Convert to HSL for saturation and brightness adjustments
            let currentHsl = tc.toHsl();

            // Adjust saturation in the HSL color space
            if (saturationChange !== 0) {
                let newSaturation = Math.max(0, Math.min(1, currentHsl.s + saturationChange / 100));
                currentHsl.s = newSaturation;
                console.log(`New Saturation: ${newSaturation}`);
            }

            // Adjust brightness in the HSL color space
            if (brightnessChange !== 0) {
                let newBrightness = Math.max(0, Math.min(1, currentHsl.l + brightnessChange / 100));
                currentHsl.l = newBrightness;
                console.log(`New Brightness: ${newBrightness}`);
            }

            // Convert back to HEX color space
            tc = tinycolor(currentHsl);
            console.log(`New Color (HEX): ${tc.toHexString()}\n`);

            return tc.toHexString();
        });

        res.json({ newColors, newVibrance: vibranceChange, newBrightness: brightnessChange });
    } else {
        res.status(400).json({ error: 'Invalid data format for colors' });
    }
});



// Function to check if two colors are similar
function areColorsSimilar(color1, color2) {
    // Adjust this threshold as needed
    const similarityThreshold = 0.2;

    const tc1 = tinycolor(color1).toHsv();
    const tc2 = tinycolor(color2).toHsv();

    // Use tinycolor's brightness-based similarity check
    const brightnessDiff = Math.abs(tc1.v - tc2.v);
    const saturationDiff = Math.abs(tc1.s - tc2.s);

    // Normalize hue difference to be between 0 and 1
    const hueDiff = Math.min(Math.abs(tc1.h - tc2.h) / 360, 1);

    // Check if the total difference is below the threshold
    const totalDifference = brightnessDiff + saturationDiff + hueDiff;

    return totalDifference < similarityThreshold;
}

// Function to generate an array of unique random colors
function generateUniqueRandomColors(numColors) {
    const colors = [];

    while (colors.length < numColors) {
        const newColor = tinycolor.random().toString("hsl");
        console.log('%cGenerated new color:', 'color: red; font-size: 14px;', newColor);

        // Check if the new color is similar to any existing color
        const isSimilar = colors.some(existingColor => areColorsSimilar(newColor, existingColor));

        if (!isSimilar) {
            colors.push(newColor);
            console.log(`%cAdded color ${colors.length}/${numColors}: ${newColor}`, 'color: red; font-size: 14px;');
        } else {
            console.log(`%cColor is similar to existing colors. Discarding.`, 'color: red; font-size: 14px;');
        }
    }

    console.log('%cFinished generating initial colors:', 'color: red; font-size: 16px;', colors);

    let iteration = 1;

    // Continue to refine colors until the desired number is reached
    while (colors.length < numColors) {
        console.log(`\n\n%cStarting iteration ${iteration} to refine colors.`, 'color: red; font-size: 16px;');

        // Filter out similar colors, leaving only one representative
        const uniqueColors = Array.from(new Set(colors));
        colors.length = 0;

        uniqueColors.forEach(color => {
            console.log(`Evaluating color: ${color}`);

            // Check if the color is similar to any remaining color
            const isSimilar = colors.some(existingColor => areColorsSimilar(color, existingColor));

            if (!isSimilar) {
                colors.push(color);
                console.log(`%cAdded refined color ${colors.length}/${numColors}: ${color}`, 'color: red; font-size: 14px;');
            } else {
                console.log(`%cColor is similar to remaining colors. Discarding.`, 'color: red; font-size: 14px;');
            }
        });

        console.log(`%cFinished iteration ${iteration} of color refinement.`, 'color: red; font-size: 16px;');
        iteration++;
    }

    console.log('%cFinal set of refined colors:', 'color: red; font-size: 16px;', colors);

    return colors;
}

// Express endpoint to handle random color requests
app.get('/randomColors', (req, res) => {
    const numColors = req.query.numColors || 10;
    console.log('Received request for random colors');
    console.log('Number of colors requested:', numColors);

    const randomColors = generateUniqueRandomColors(numColors);

    res.json({ randomColors });
});

// Add new endpoint for BPM analysis
app.post('/analyze-bpm', async (req, res) => {
  console.log('🎵 [BPM-Analysis] Starting BPM analysis request');
  try {
    const { previewUrl } = req.body;
    console.log('🔍 [BPM-Analysis] Received preview URL:', previewUrl);

    if (!previewUrl) {
      console.error('❌ [BPM-Analysis] No preview URL provided');
      return res.status(400).json({ error: 'Preview URL is required' });
    }

    // Fetch the audio file
    console.log('📥 [BPM-Analysis] Fetching audio file from preview URL...');
    const audioResponse = await fetch(previewUrl);
    
    if (!audioResponse.ok) {
      console.error(`❌ [BPM-Analysis] Failed to fetch audio file. Status: ${audioResponse.status}`);
      return res.status(500).json({ error: 'Failed to fetch audio file from Spotify' });
    }

    console.log('✅ [BPM-Analysis] Audio file fetched successfully');
    console.log('📊 [BPM-Analysis] Content-Type:', audioResponse.headers.get('content-type'));
    console.log('📊 [BPM-Analysis] Content-Length:', audioResponse.headers.get('content-length'));

    const arrayBuffer = await audioResponse.arrayBuffer();
    console.log('✅ [BPM-Analysis] Audio file converted to ArrayBuffer');
    console.log('📊 [BPM-Analysis] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');
    // Ensure audioDecode is loaded
    if (!audioDecode) {
      audioDecode = (await import('audio-decode')).default;
    }
    const audioBuffer = await audioDecode(Buffer.from(arrayBuffer));
    console.log('✅ [BPM-Analysis] Audio buffer decoded');
    console.log('📊 [BPM-Analysis] Audio Buffer Details:');
    console.log('   - Duration:', audioBuffer.duration, 'seconds');
    console.log('   - Sample Rate:', audioBuffer.sampleRate, 'Hz');
    console.log('   - Number of Channels:', audioBuffer.numberOfChannels);

    // Analyze the audio buffer for BPM
    console.log('🔍 [BPM-Analysis] Starting BPM analysis...');
    const result = await analyzeFullBuffer(audioBuffer);
    console.log('✅ [BPM-Analysis] BPM analysis completed');
    console.log('🎵 [BPM-Analysis] Detected BPM:', result.tempo);

    res.json({ 
      bpm: result.tempo,
      analysisDetails: {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      }
    });
  } catch (error) {
    console.error('❌ [BPM-Analysis] Critical error in BPM analysis:', error);
    console.error('   - Error name:', error.name);
    console.error('   - Error message:', error.message);
    console.error('   - Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to process audio', details: error.message });
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add new endpoint for BPM analysis using Gemini
app.post('/analyze-bpm-ai', async (req, res) => {
  console.log('🤖 [AI-Analysis] Starting BPM analysis request');
  try {
    const { trackName, artistName } = req.body;
    console.log(`🔍 [AI-Analysis] Analyzing BPM for ${trackName} by ${artistName}`);

    // Use gemini-2.0-flash with Google Search capability
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    // First attempt - general search
    const initialPrompt = `${artistName} - ${trackName} bpm (structure response as BPM: number)
    Rules:
    1. Use Google Search to find accurate BPM information
    2. If multiple BPM values exist, use the most commonly cited one
    3. Return ONLY the BPM in format "BPM: number"
    4. Do not include any explanatory text
    5. The song might be too new for a concrete result but you need to make sure that the artist is/are ${artistName} and the song name is ${trackName}
    6. There might be other songs with the same name but different artist thus tis imperative to get the artist right
    7. As a last resort you are allowed to search reddit and wiki as well as other google search connected tools to get the result if you are struggling`;

    console.log('📤 [AI-Analysis] Sending initial request to Gemini');
    let result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: initialPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.1,
        topK: 1
      }
    });

    let text = result.response.text().trim();
    console.log('✅ [AI-Analysis] Received initial response:', text);

    // Extract BPM from response
    let bpmMatch = text.match(/BPM:\s*(\d+)/i);
    let bpm = bpmMatch ? parseInt(bpmMatch[1]) : 0;

    // If first attempt fails, try with specific site search
    if (bpm === 0) {
      console.log('⚠️ [AI-Analysis] Initial search failed, trying specific site search');
      
      const siteSearchPrompt = `Search for the BPM of \"${trackName}\" by ${artistName} using these specific steps:
      1. Check https://tunebat.com/Search?q=${encodeURIComponent(artistName + ' ' + trackName)}
        1.1 You can also run something like fetch(\"https://api.tunebat.com/api/tracks/search?${encodeURIComponent(artistName)}-${encodeURIComponent(trackName)}&page=1\", {
      \"headers\": {
        \"accept\": \"application/json, text/plain, */*\",
        \"accept-language\": \"en-US,en-GB;q=0.9,en;q=0.8,bg;q=0.7,am;q=0.6,fr;q=0.5\",
        \"priority\": \"u=1, i\",
        \"sec-ch-ua\": \"\\\"Chromium\\\";v=\\\"136\\\", \\\"Google Chrome\\\";v=\\\"136\\\", \\\"Not.A/Brand\\\";v=\\\"99\\\"\",
        \"sec-ch-ua-mobile\": \"?0\",
        \"sec-ch-ua-platform\": \"\\\"Windows\\\"\",
        \"sec-fetch-dest\": \"empty\",
        \"sec-fetch-mode\": \"cors\",
        \"sec-fetch-site\": \"same-site\",
        \"sec-gpc\": \"1\",
        \"Referer\": \"https://tunebat.com/\",
        \"Referrer-Policy\": \"strict-origin-when-cross-origin\"
      },
      \"body\": null,
      \"method\": \"GET\"
    });
      2. If not found, check https://songbpm.com/@${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}
      3. Return ONLY the BPM in format \"BPM: number\"
      4. Do not include any explanatory text`;

      console.log('📤 [AI-Analysis] Sending site-specific search request');
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: siteSearchPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.1,
          topK: 1
        }
      });

      text = result.response.text().trim();
      console.log('✅ [AI-Analysis] Received site-specific response:', text);

      bpmMatch = text.match(/BPM:\s*(\d+)/i);
      bpm = bpmMatch ? parseInt(bpmMatch[1]) : 0;
    }

    if (bpm === 0) {
      console.warn('⚠️ [AI-Analysis] Could not extract valid BPM from any source');
    } else {
      console.log('🎵 [AI-Analysis] Successfully extracted BPM:', bpm);
    }

    res.json({ bpm, rawResponse: text });
  } catch (error) {
    console.error('❌ [AI-Analysis] Error:', error);
    res.status(500).json({ error: 'Failed to analyze BPM', details: error.message });
  }
});

// Add required packages at the top
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// Function to retry failed operations
async function retry(fn, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`❌ [YouTube-Analysis] Attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`⏳ [YouTube-Analysis] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  throw lastError;
}

// Common headers for ytdl requests
const YTDL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
  'Cache-Control': 'max-age=0'
};

// YouTube API integration
const { google } = require('googleapis');
const youtube = google.youtube('v3');

// Initialize the YouTube API client
const youtubeClient = youtube.videos;

// Function to get video details from YouTube API
async function getVideoDetails(videoId) {
  try {
    console.log('🔍 [YouTube-API] Getting video details for:', videoId);
    const response = await youtube.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
      key: process.env.YOUTUBE_API_KEY
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    const duration = video.contentDetails.duration;
    // Convert ISO 8601 duration to seconds
    const durationSeconds = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
      .slice(1)
      .map(x => x ? parseInt(x) : 0)
      .reduce((acc, x) => acc * 60 + x);

    return {
      title: video.snippet.title,
      duration: durationSeconds,
      description: video.snippet.description
    };
  } catch (error) {
    console.error('❌ [YouTube-API] Error getting video details:', error);
    throw error;
  }
}

// Add YouTube BPM analysis endpoint
app.post('/analyze-youtube-bpm', async (req, res) => {
  console.log('🎵 [YouTube-Analysis] Starting YouTube BPM analysis request');
  try {
    const { url } = req.body;
    console.log('🔍 [YouTube-Analysis] Analyzing URL:', url);

    if (!url) {
      console.error('❌ [YouTube-Analysis] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract video ID and get info with retries
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }

    // Get video info using YouTube API first
    let videoInfo;
    try {
      console.log('🔍 [YouTube-Analysis] Attempting to use YouTube API...');
      const videoDetails = await getVideoDetails(videoId);
      videoInfo = {
        videoDetails: {
          title: videoDetails.title,
          lengthSeconds: videoDetails.duration.toString()
        }
      };
      console.log('✅ [YouTube-Analysis] YouTube API fetch successful');
    } catch (apiError) {
      console.warn('⚠️ [YouTube-Analysis] YouTube API failed, falling back to ytdl-core');
      
      // Fall back to ytdl-core with retries
      videoInfo = await retry(async () => {
        return await ytdl.getInfo(url, {
          requestOptions: { headers: YTDL_HEADERS }
        });
      });
    }

    // Process video in segments
    const duration = parseInt(videoInfo.videoDetails.lengthSeconds);
    console.log('📊 [YouTube-Analysis] Video duration:', duration, 'seconds');

    let segments = [];
    if (duration <= 30) {
      segments.push({ start: 0, duration: duration });
      console.log('📊 [YouTube-Analysis] Short video - analyzing entire duration');
    } else {
      // Analyze three 30-second segments from different parts of the video
      const segmentDuration = 30;
      const segmentStarts = [
        0, // Beginning
        Math.floor(duration / 2) - 15, // Middle
        Math.max(0, duration - 30) // End
      ];
      segments = segmentStarts.map(start => ({
        start,
        duration: Math.min(segmentDuration, duration - start)
      }));
      console.log('📊 [YouTube-Analysis] Long video - analyzing segments:', segments);
    }

    // Process each segment
    const chunks = [];
    const bpmResults = [];
    
    for (const segment of segments) {
      console.log(`🎵 [YouTube-Analysis] Processing segment: ${segment.start}s to ${segment.start + segment.duration}s`);
      
      try {
        const audioStream = ytdl(url, {
          filter: 'audioonly',
          quality: 'highestaudio',
          requestOptions: { headers: YTDL_HEADERS }
        });

        // Convert to audio buffer using ffmpeg
        const buffer = await new Promise((resolve, reject) => {
          ffmpeg(audioStream)
            .toFormat('wav')
            .setStartTime(segment.start)
            .setDuration(segment.duration)
            .on('error', (err) => {
              console.error('❌ [YouTube-Analysis] FFmpeg error:', err);
              reject(err);
            })
            .on('end', () => {
              console.log('✅ [YouTube-Analysis] FFmpeg processing complete');
            })
            .pipe()
            .on('data', (data) => {
              chunks.push(data);
            })
            .on('end', () => {
              console.log('✅ [YouTube-Analysis] Audio stream ended');
              resolve(Buffer.concat(chunks));
            });
        });

        // Ensure audioDecode is loaded
        if (!audioDecode) {
          audioDecode = (await import('audio-decode')).default;
        }
        // Create AudioContext and decode audio
        const audioBuffer = await audioDecode(buffer);
        console.log('✅ [YouTube-Analysis] Audio buffer decoded');

        // Analyze the segment
        const result = await analyzeFullBuffer(audioBuffer);
        bpmResults.push(result.tempo);
        console.log(`✅ [YouTube-Analysis] Segment BPM:`, result.tempo);
      } catch (segmentError) {
        console.error(`❌ [YouTube-Analysis] Error processing segment:`, segmentError);
        // Continue with other segments if one fails
        continue;
      }
    }

    if (bpmResults.length === 0) {
      throw new Error('Could not analyze any segments successfully');
    }

    // Calculate final BPM
    const averageBPM = Math.round(bpmResults.reduce((a, b) => a + b, 0) / bpmResults.length);
    console.log('🎵 [YouTube-Analysis] Final average BPM:', averageBPM);

    res.json({ 
      bpm: averageBPM,
      title: videoInfo.videoDetails.title,
      duration: duration,
      analyzedSegments: segments.length,
      segmentResults: bpmResults,
      confidence: bpmResults.length === segments.length ? 'high' : 'medium'
    });

  } catch (error) {
    console.error('❌ [YouTube-Analysis] Critical error:', error);
    
    // Try AI fallback if video info is available
    try {
      if (videoInfo?.videoDetails?.title) {
        console.log('🤖 [YouTube-Analysis] Falling back to AI analysis');
        const bpm = await getBPMFromAI(videoInfo.videoDetails.title, '');
        return res.json({ 
          bpm, 
          method: 'ai_fallback',
          confidence: 'low',
          title: videoInfo.videoDetails.title
        });
      }
      
      throw new Error('No video information available for AI fallback');
    } catch (fallbackError) {
      console.error('❌ [YouTube-Analysis] Fallback also failed:', fallbackError);
      return res.status(500).json({ 
        error: 'Could not analyze video', 
        details: error.message,
        fallbackError: fallbackError.message 
      });
    }
  }
});
