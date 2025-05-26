
// exports.handler = async (event, context) => {

// const isReplit = process.env.REPLIT_ENV === 'true';

// const express = require('express');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const path = require('path');
// const SpotifyWebApi = require('spotify-web-api-node');
// const fetch = isReplit ? require('@replit/node-fetch') : require('node-fetch');
// const querystring = require('querystring'); // Import the 'querystring' library
// const extractColors = require('extract-colors'); // Import the 'extract-colors' library
// const Vibrant = require('node-vibrant');
// const sharp = require('sharp'); // Import the sharp library
// const axios = require('axios');
// const cheerio = require('cheerio'); // Include cheerio
// const tinycolor = require('tinycolor2');
// const serverless = require('serverless-http');

// const app = express();
// const port = process.env.PORT || 8888;
// // Check if the code is running in a Repl.it environment


// // Define the base URL for Netlify deployment
// const netlifyBaseUrl = 'https://bpm-flash-4-spotify.netlify.app';

// // Define the base URL for Repl.it deployment
// const replitBaseUrl = 'https://bpm-flash-4-spotify.mv47.repl.co';

// // Set the redirect URI based on the environment
// const redirectUri = isReplit ? `${replitBaseUrl}/callback` : `${netlifyBaseUrl}/callback`;

// // Now you can use the dynamic redirectUri in your code
// console.log('Redirect URI:', redirectUri);

// const clientId = process.env.CLIENT_ID; // Updated variable name for clarity
// const clientSecret = process.env.CLIENT_SECRET; // Updated variable name for clarity
// let lastLoggedIn;

// // Set the CORS options based on the environment
// let corsOptions;
// if (isReplit) {
//     corsOptions = {
//         origin: replitBaseUrl,
//         methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//         credentials: true,
//         optionsSuccessStatus: 204,
//     };
// } else {
//     corsOptions = {
//         origin: netlifyBaseUrl,
//         methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//         credentials: true,
//         optionsSuccessStatus: 204,
//     };
// }

// app.use(cors(corsOptions));
// app.use(express.static(__dirname + '/pb')).use(cors()).use(cookieParser());
// app.use(express.json());

// const scope = 'user-read-private user-read-email user-read-currently-playing user-modify-playback-state user-read-playback-state ' +
//   'playlist-read-private playlist-modify-private playlist-modify-public playlist-read-collaborative user-top-read user-library-read ' + 
//   'user-library-modify ugc-image-upload';


// function formatTimestamp(timestamp) {
//   const days = Math.floor(timestamp / (3600 * 24));
//   const hours = Math.floor((timestamp % (3600 * 24)) / 3600);
//   const minutes = Math.floor((timestamp % 3600) / 60);
//   const seconds = Math.floor(timestamp % 60);

//   return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
// }

// // Function to check if the access token is about to expire
// function tokenIsAboutToExpire(expiresIn,lastLoggedIn) {
//     const timeDifference = ((Date.now() / 1000) - lastLoggedIn);
//     console.log(`${expiresIn-timeDifference} seconds left before expire`  );
//     if(isNaN(`${expiresIn-timeDifference}`)){
//       return true;
//     }
//     return expiresIn-timeDifference <= 600; // 300 seconds (5 minutes) buffer before expiration
// }


// // Function to refresh the access token
// async function refreshAccessToken(refreshToken) {
//     const authOptions = {
//         url: 'https://accounts.spotify.com/api/token',
//         form: {
//             grant_type: 'refresh_token',
//             refresh_token: refreshToken,
//         },
//         headers: {
//             'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
//             'Content-Type': 'application/x-www-form-urlencoded',
//         },
//     };

//     try {
//         const response = await fetch(authOptions.url, {
//             method: 'POST',
//             body: querystring.stringify(authOptions.form),
//             headers: authOptions.headers,
//         });

//         if (response.status === 200) {
//             const data = await response.json();
//             console.log('Refreshed access token successfully');
//             return data.access_token; // New access token
//         } else {
//             console.error('1Error refreshing access token:', response.statusText);
//             return null;
//         }
//     } catch (error) {
//         console.error('2Error refreshing access token:', error);
//         return null;
//     }
// }

// // Middleware to check and refresh the access token
// app.use(async (req, res, next) => {
//     const access_token = req.cookies.access_token;
//     const expires_in = req.cookies.expires_in;
//     const last_logged_in = req.cookies.last_logged_in;
//   console.log (`INSIDE REFRESH TOKEN - app.use`)
//   console.log(tokenIsAboutToExpire(expires_in, last_logged_in));
//     if (access_token && tokenIsAboutToExpire(expires_in, last_logged_in)) {
//         const refresh_token = req.cookies.refresh_token; // Retrieve your stored refresh token
//         const newAccessToken = await refreshAccessToken(refresh_token);

//         if (newAccessToken) {
//             // Update the access token in your storage
//             res.cookie('access_token', newAccessToken);
//             req.cookies.access_token = newAccessToken; // Update the request object
//             lastLoggedIn= Date.now()/1000;
//             res.cookie('last_logged_in', lastLoggedIn);
//             req.cookies.last_logged_in = lastLoggedIn; // Update the request object
//         }
//     }

//     next();
// });

// app.get('/refresh-token', async (req, res) => {
//     const access_token = req.cookies.access_token;
//     const expires_in = req.cookies.expires_in;
//     const last_logged_in = req.cookies.last_logged_in;
//     console.log('INSIDE REFRESH TOKEN inside /refresh-token');

//     if (access_token && tokenIsAboutToExpire(expires_in,last_logged_in)) {
//         const refresh_token = req.cookies.refresh_token;
//         const newAccessToken = await refreshAccessToken(refresh_token);

//         if (newAccessToken) {
//             // Update the access token in your storage
//             res.cookie('access_token', newAccessToken);
//             req.cookies.access_token = newAccessToken; // Update the request object
//             lastLoggedIn= Date.now()/1000;
//             res.cookie('last_logged_in', lastLoggedIn);
//             req.cookies.last_logged_in = lastLoggedIn; // Update the request object
            
//             console.log('Access token refreshed successfully from /refresh-token');
//             res.sendStatus(200); // Send a success response
//         } else {
//             res.sendStatus(500); // Send an error response if token refresh fails
//         }
//     } else {
//         res.sendStatus(200); // If token is still valid, send a success response
//     }
// });


// app.get('/', function (req, res) {
//     res.sendFile(path.join(__dirname, '/pb/index.html'));
// });

// app.get('/login', function(req, res) {
//     const state = generateRandomString(16);
//     const showDialog = true;

//     const spotifyAuthUrl = 'https://accounts.spotify.com/authorize?' +
//         querystring.stringify({
//             response_type: 'code',
//             client_id: clientId,
//             scope: scope,
//             redirect_uri: redirectUri,
//             state: state,
//             show_dialog: isReplit ? false : true
//         });

//     console.log('Redirecting to Spotify login:', spotifyAuthUrl);

//     res.redirect(spotifyAuthUrl);
//     lastLoggedIn = Date.now() / 1000;
// });


// app.get('/logout', function(req, res) {
//   res.clearCookie('access_token');
//   res.clearCookie('refresh_token');
//   res.clearCookie('expires_in');
//   res.clearCookie('last_logged_in');

//   // Send a success response and trigger a page reload in the client
//   res.status(200).send('You have been logged out. <script>window.location.reload();</script>');
// });





// app.get('/callback', async function(req, res) {
//     const code = req.query.code || null;
//     const state = req.query.state || null;

//     if (state === null) {
//         res.redirect('/#' +
//             querystring.stringify({
//                 error: 'state_mismatch'
//             }));
//     } else {
//         const authOptions = {
//             url: 'https://accounts.spotify.com/api/token',
//             form: {
//                 code: code,
//                 redirect_uri: redirectUri,
//                 grant_type: 'authorization_code'
//             },
//             headers: {
//                 'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64'))
//             },
//             json: true
//         };

//         try {
//             const response = await fetch(authOptions.url, {
//                 method: 'POST',
//                 body: querystring.stringify(authOptions.form),
//                 headers: {
//                     'Authorization': authOptions.headers.Authorization,
//                     'Content-Type': 'application/x-www-form-urlencoded'
//                 }
//             });

//             if (response.status === 200) {
//                 const data = await response.json();
//                 lastLoggedIn= Date.now()/1000;
//                 // Now you have the access token and can use it for your API requests
//                 const access_token = data.access_token;
//                 // You should also get and store the refresh token here
//                 const refresh_token = data.refresh_token;
//                 const expires_in = data.expires_in;
//               console.log(`in /callback: expiration `, formatTimestamp(expires_in))
//               tokenIsAboutToExpire(expires_in, lastLoggedIn)
//                 console.log('Access token obtained successfully');
//                 console.log('Access token:', access_token);
//                 console.log('Refresh token:', refresh_token);
//                 console.log('Expires in:', expires_in);

//                 // Set the access token, refresh token, and expiration time in cookies
//                 res.cookie('access_token', access_token);
//                 res.cookie('refresh_token', refresh_token);
//                 res.cookie('expires_in', expires_in);
//                 res.cookie('last_logged_in', lastLoggedIn);

//                 // Redirect to your desired page after authentication
//                 res.redirect('/');
//             } else {
//                 console.error('Error fetching access token:', response.statusText);
//                 res.send('Error occurred during authentication.');
//             }
//         } catch (error) {
//             console.error('Error fetching access token:', error);
//             res.send('Error occurred during authentication.');
//         }
//     }
// });
// // Define a function to print the time difference
// function printTimeDifference() {
//     const timeDifference = (Date.now() / 1000 - lastLoggedIn);
//     console.log(timeDifference);
// }



// app.listen(port, () => {
//   console.log('Server started at port ' + port);
// });

// // Function to generate a random string
// function generateRandomString(length) {
//   let text = '';
//   const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

//   for (let i = 0; i < length; i++) {
//     text += possible.charAt(Math.floor(Math.random() * possible.length));
//   }

//   return text;
// }


// // Updated route to accept the 'url' parameter
// app.get('/getColors', async function(req, res) {
//   const imageUrl = req.query.url; // Get the 'url' parameter from the query string

//   // Fetch the image from the provided URL (you may need to adjust this based on your requirements)
//   const imageResponse = await fetch(imageUrl);
//   const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

// try {
//   // Define the number of quadrants (e.g., 4 for dividing into four parts)
//   const numQuadrants = 4;

//   // Get image dimensions
//   const { width, height } = await getImageDimensions(imageBuffer);

//   // Calculate the dimensions of each quadrant
//   const quadrantWidth = Math.floor(width / numQuadrants);
//   const quadrantHeight = Math.floor(height / numQuadrants);

//   // Initialize an array to store the colors from all quadrants
//   const allColors = [];
//   const swatchedColors = [];
  
//   // Process each quadrant separately
//   for (let i = 0; i < numQuadrants; i++) {
//     for (let j = 0; j < numQuadrants; j++) {
//       // Calculate the coordinates of the current quadrant
//       const x1 = i * quadrantWidth;
//       const x2 = (i + 1) * quadrantWidth;
//       const y1 = j * quadrantHeight;
//       const y2 = (j + 1) * quadrantHeight;

//       // Crop the image to the current quadrant
//       const quadrantBuffer = await cropImage(imageBuffer, x1, y1, x2, y2);

//       // Create a Vibrant object with the quadrant image
//       const palette = await Vibrant.from(quadrantBuffer).getPalette();
      
//       // Extract swatch colors from the quadrant palette
//       const swatchColors = Object.values(palette).map(swatch => swatch? swatch.getHex() :null).filter(swatch => swatch !== null);
//       // console.log(swatchColors);
//       swatchedColors.push(...swatchColors);
//       // console.log("Pushed to swatched colors:");
//       // console.log(swatchColors);
//       // console.log("Colors in swatched colors");
//       // console.log(swatchedColors);

//       // Filter and add the colors to the allColors array (adjust criteria as needed)
//       const filteredColors = swatchColors.filter(color => {
//         const [r, g, b] = hexToRgb(color);
//         const saturation = calculateSaturation(r, g, b);
//         const vibrancy = calculateVibrancy(r, g, b);
//         const minSaturation = 0.5;
//         const minVibrancy = 0.5;
//         return saturation >= minSaturation && vibrancy >= minVibrancy;
//       });

//       allColors.push(...filteredColors);
//     }
//   }

//   // Randomize the colors
//   const randomizedColors = shuffleArray(allColors);

//   // Remove similar colors (adjust tolerance as needed, smaller values are more strict)
//   const filteredColors = removeSimilarColors(randomizedColors, 35);

//   // Check if filteredColors has fewer than 2 colors
//   if (filteredColors.length < 2) {
//       // Create an array to store the 5 random colors
//       const randomColors = [];
//       const swatchColors = [...new Set(swatchedColors)];
//       // Ensure that randomizedColors has at least 5 colors
//       console.log("All unique colors before filtering:");
//       console.log(swatchColors);
//       if (swatchedColors.length >= 5) {
//           // Generate 5 random indices to select colors from randomizedColors
//           const randomIndices = [];
//           while (randomIndices.length < 5) {
//               const randomIndex = Math.floor(Math.random() * swatchColors.length);
//               if (!randomIndices.includes(randomIndex)) {
//                   randomIndices.push(randomIndex);
//               }
//           }
  
//           // Retrieve the selected random colors and add them to randomColors
//           randomIndices.forEach(index => {
//               randomColors.push(swatchColors[index]);
//           });
            
//             // Check if filteredColors is not empty and add its contents to randomColors
//             if (filteredColors.length > 0) {
//                 randomColors.push(...filteredColors);
//             }
//             // Respond with the selected colors as JSON
//             res.json(randomColors);
//       } else {
//           // Handle the case where randomizedColors has fewer than 5 colors
//           console.error("randomizedColors should have at least 5 colors.");
//       }
  
//       // Now, randomColors contains 5 random colors (if available)
//       console.log(randomColors);
//   } else{
//     // Respond with the selected colors as JSON
//     res.json(filteredColors);
//   }

  
// } catch (error) {
//   console.error('Error:', error);
//   res.status(500).json({ error: 'Error extracting colors' });
// }
// });

// // Function to convert hex color to RGB
// function hexToRgb(hex) {
//   const bigint = parseInt(hex.slice(1), 16);
//   return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
// }

// // Function to calculate saturation of an RGB color
// function calculateSaturation(r, g, b) {
//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);
//   const delta = max - min;
//   return delta / max;
// }

// // Function to calculate vibrancy of an RGB color
// function calculateVibrancy(r, g, b) {
//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);
//   return max - min;
// }

// // Function to shuffle an array (Fisher-Yates shuffle)
// function shuffleArray(array) {
//   const shuffled = array.slice();
//   for (let i = shuffled.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
//   }
//   return shuffled;
// }

// // Function to select a darker color
// function selectDarkerColor(colors) {
//   // You can define your own logic to select a darker color from the array
//   // For example, you can sort the colors by brightness and select the darkest one
//   // Here, we'll simply select the first color from the array as the darker color
//   return colors[0];
// }

// // Function to select a lighter color
// function selectLighterColor(colors) {
//   // You can define your own logic to select a lighter color from the array
//   // For example, you can sort the colors by brightness and select the lightest one
//   // Here, we'll simply select the last color from the array as the lighter color
//   return colors[colors.length - 1];
// }

// // Function to get image dimensions from a buffer
// async function getImageDimensions(imageBuffer) {
//   try {
//     const metadata = await sharp(imageBuffer).metadata();
//     return { width: metadata.width, height: metadata.height };
//   } catch (error) {
//     console.error('Error getting image dimensions:', error);
//     throw error;
//   }
// }

// // Function to crop an image buffer to specified coordinates
// async function cropImage(imageBuffer, x1, y1, x2, y2) {
//   try {
//     const croppedBuffer = await sharp(imageBuffer)
//       .extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 })
//       .toBuffer();
//     return croppedBuffer;
//   } catch (error) {
//     console.error('Error cropping image:', error);
//     throw error;
//   }
// }

// // Function to remove similar colors from an array
// function removeSimilarColors(colors, tolerance = 32) {
//   const result = [];

//   for (const color of colors) {
//     // Convert the color to RGB format
//     const rgbColor = hexToRgb(color);

//     // Check if the color is different enough from colors already in the result
//     const isDifferent = result.every(existingColor => {
//       const diff = Math.abs(existingColor[0] - rgbColor[0]) +
//         Math.abs(existingColor[1] - rgbColor[1]) +
//         Math.abs(existingColor[2] - rgbColor[2]);

//       return diff >= tolerance;
//     });

//     if (isDifferent) {
//       result.push(rgbColor);
//     }
//   }

//   // Convert the result back to hex format
//   const hexResult = result.map(rgbColor => rgbToHex(...rgbColor));

//   return hexResult;
// }

// // Function to convert RGB values to a hex color
// function rgbToHex(r, g, b) {
//   const toHex = (value) => {
//     const hex = value.toString(16);
//     return hex.length === 1 ? '0' + hex : hex;
//   };

//   return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
// }







// // Recursive function to log the structure of Cheerio data
// function logCheerioStructure(element, depth = 0) {
//     // Log the element's tag name and text
//     console.log(' '.repeat(depth * 2) + element.name);

//     // Recursively log children
//     if (element.children) {
//         for (const child of element.children) {
//             logCheerioStructure(child, depth + 1);
//         }
//     }
// }


// // Function to extract type and name from HTML
// function extractTypeAndNameFromHTML(html) {
//     const $ = cheerio.load(html.data);
//     // console.log("OPEN SPOTIFY RESPONSE\n\n\n\n", html)

//     // Extract the title from the <title> tag
//     const title = $('title').text();

//     // Split the title by '-'
//     const titleParts = title.split('-');

//     // If there are at least two parts, use them as type and name
//     if (titleParts.length >= 2) {
//         const type = titleParts[0].trim();
//         const name = titleParts.slice(1).join('-').trim();
//         return { type, name };
//     }

//     // If there are not enough parts, return the entire title as the name
//     return { type: '', name: title.trim() };
// }


// app.get('/unshorten-new-spotify-link', async (req, res) => {
//     const shortLink = req.query.shortLink;
//     console.log('Received shortLink:', shortLink);

//     if (
//         !shortLink.startsWith('https://spotify.link/') &&
//         !shortLink.startsWith('https://spotify.app.link/')
//     ) {
//       console.log('Not a Spotify link from shortLink', currentURL);
//         return res.status(400).json({ error: 'Not a valid Spotify link' });
//     }

//     // Now proceed with the redirection logic
//     let currentURL = decodeURIComponent(shortLink);
//     console.log('decoded shortLink:', currentURL);
//     try {
//         while (true) {
//                 console.log('Current Link in while loop: ', currentURL);

//             const response = await axios.get(currentURL);
//             const $ = cheerio.load(response.data);
//             // // Log the structure of the entire Cheerio data
//             // console.log('Structure of Entire Cheerio Data:');
//             // logCheerioStructure($.root()[0], 0);
//             // Extract the URL from the HTML
//             const extractedURL = $('a.secondary-action').attr('href');
//             // console.log('RESPONSE \n\n', response)

//             if (response.status >= 200 && response.status < 400 && response.headers) {
//                 // It's a redirection
//                 currentURL = extractedURL.split('?')[0];
//                 console.log('Redirected URL:', currentURL);

//                 if (currentURL.includes('open.spotify.com/')) {
//                     // We've reached the desired URL
//                     console.log('Reached the desired URL:', currentURL);
//                     const finalPageResponse = await axios.get(shortLink);
//                     const { type, name } = extractTypeAndNameFromHTML(finalPageResponse);
//                     res.status(200).json({ unshortenedLink: currentURL, type, name });
//                     break;
//                 }
//             } else {
//                 // It's not a redirection, and it's not the desired URL
//                 console.log('Not a open.spotify.com/ Spotify link ', currentURL);
//             }
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });





// // Track the primary color and transition
// const primaryColors = {};

// // Array to store SSE clients
// const sseClients = {};

// const overlayStorage = {};

// // SSE route for secondary to subscribe to color updates
// app.get('/subscribe', (req, res) => {
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');

//     const { code } = req.query;

//     // Send initial color and transition to set the background color based on the code
//     const initialColor = primaryColors[code] ? primaryColors[code].color : "#424242";
//     const initialTransition = primaryColors[code] ? primaryColors[code].transition : "0s";

//     res.write(`data: ${JSON.stringify({ color: initialColor, transition: initialTransition })}\n\n`);

//     // Add the client to the list to send updates based on the code
//     if (!sseClients[code]) {
//         sseClients[code] = [];
//     }
//     sseClients[code].push(res);

//     // Remove the client from the list when the connection is closed
//     req.on('close', () => {
//         const index = sseClients[code].indexOf(res);
//         if (index !== -1) {
//             sseClients[code].splice(index, 1);
//         }
//     });
// });

// // Function to send color updates to all subscribed clients based on the code
// function sendColorUpdate(code, color, transition) {
//     if (sseClients[code]) {
//         sseClients[code].forEach(client => {
//             client.write(`data: ${JSON.stringify({ color, transition })}\n\n`);
//         });
//     }
// }

// // Function to update the color and send updates to clients based on the code
// function updateColorAndNotify(code, newColor, transition) {
//     primaryColors[code] = { color: newColor, transition: transition };
//     sendColorUpdate(code, newColor, transition);
// }

// // Route to update the color from the primary based on the code
// app.put('/updateColor/:code/:color/:transition', (req, res) => {
//     const { code, color, transition } = req.params;
//     updateColorAndNotify(code, color, transition);
//     res.send('Color updated successfully');
// });


// app.post('/saveoverlaydata', express.json(), (req, res) => {
//     const { code } = req.query;
//     const { overlayHTML } = req.body;

//     // console.log('Received overlay data for code', code, ':', overlayHTML);

//     if (!overlayStorage[code]) {
//         overlayStorage[code] = {};
//     }

//     overlayStorage[code] = overlayHTML?overlayHTML:'';

//     res.status(200).send('Overlay data received successfully');
// });



// app.get('/getoverlaydata', async (req, res) => {
//     const { code } = req.query;

//     // console.log('Sending overlay data for code', code, ':', overlayStorage[code]);

//     res.status(200).json({ overlayHTML: overlayStorage[code] || {} });
// });




// app.post('/adjustColors', (req, res) => {
//     let colors = req.body.customFlashingColors;
//     let saturationChange = req.body.saturationChange;
//     let vibranceChange = req.body.vibranceChange;
//     let brightnessChange = req.body.brightnessChange;

//     // Check if colors is an array
//     if (Array.isArray(colors)) {
//         let newColors = colors.map(color => {
//             let tc = tinycolor(color);
//             let currentVibrance = tc.toHsv().v;

//             console.log(`Original Color: ${color}`);
//             console.log(`Current Vibrance: ${currentVibrance}`);

//             // Adjust vibrance in the HSV color space
//             if (vibranceChange !== 0) {
//                 let newVibrance = Math.max(0, Math.min(1, currentVibrance + vibranceChange / 100));
//                 tc = tinycolor({ h: tc.toHsv().h, s: tc.toHsv().s, v: newVibrance });
//                 console.log(`New Vibrance: ${newVibrance}`);
//             }

//             // Convert to HSL for saturation and brightness adjustments
//             let currentHsl = tc.toHsl();

//             // Adjust saturation in the HSL color space
//             if (saturationChange !== 0) {
//                 let newSaturation = Math.max(0, Math.min(1, currentHsl.s + saturationChange / 100));
//                 currentHsl.s = newSaturation;
//                 console.log(`New Saturation: ${newSaturation}`);
//             }

//             // Adjust brightness in the HSL color space
//             if (brightnessChange !== 0) {
//                 let newBrightness = Math.max(0, Math.min(1, currentHsl.l + brightnessChange / 100));
//                 currentHsl.l = newBrightness;
//                 console.log(`New Brightness: ${newBrightness}`);
//             }

//             // Convert back to HEX color space
//             tc = tinycolor(currentHsl);
//             console.log(`New Color (HEX): ${tc.toHexString()}\n`);

//             return tc.toHexString();
//         });

//         res.json({ newColors, newVibrance: vibranceChange, newBrightness: brightnessChange });
//     } else {
//         res.status(400).json({ error: 'Invalid data format for colors' });
//     }
// });



// // Function to check if two colors are similar
// function areColorsSimilar(color1, color2) {
//     // Adjust this threshold as needed
//     const similarityThreshold = 0.2;

//     const tc1 = tinycolor(color1).toHsv();
//     const tc2 = tinycolor(color2).toHsv();

//     // Use tinycolor's brightness-based similarity check
//     const brightnessDiff = Math.abs(tc1.v - tc2.v);
//     const saturationDiff = Math.abs(tc1.s - tc2.s);

//     // Normalize hue difference to be between 0 and 1
//     const hueDiff = Math.min(Math.abs(tc1.h - tc2.h) / 360, 1);

//     // Check if the total difference is below the threshold
//     const totalDifference = brightnessDiff + saturationDiff + hueDiff;

//     return totalDifference < similarityThreshold;
// }

// // Function to generate an array of unique random colors
// function generateUniqueRandomColors(numColors) {
//     const colors = [];

//     while (colors.length < numColors) {
//         const newColor = tinycolor.random().toString("hsl");
//         console.log('%cGenerated new color:', 'color: red; font-size: 14px;', newColor);

//         // Check if the new color is similar to any existing color
//         const isSimilar = colors.some(existingColor => areColorsSimilar(newColor, existingColor));

//         if (!isSimilar) {
//             colors.push(newColor);
//             console.log(`%cAdded color ${colors.length}/${numColors}: ${newColor}`, 'color: red; font-size: 14px;');
//         } else {
//             console.log(`%cColor is similar to existing colors. Discarding.`, 'color: red; font-size: 14px;');
//         }
//     }

//     console.log('%cFinished generating initial colors:', 'color: red; font-size: 16px;', colors);

//     let iteration = 1;

//     // Continue to refine colors until the desired number is reached
//     while (colors.length < numColors) {
//         console.log(`\n\n%cStarting iteration ${iteration} to refine colors.`, 'color: red; font-size: 16px;');

//         // Filter out similar colors, leaving only one representative
//         const uniqueColors = Array.from(new Set(colors));
//         colors.length = 0;

//         uniqueColors.forEach(color => {
//             console.log(`Evaluating color: ${color}`);

//             // Check if the color is similar to any remaining color
//             const isSimilar = colors.some(existingColor => areColorsSimilar(color, existingColor));

//             if (!isSimilar) {
//                 colors.push(color);
//                 console.log(`%cAdded refined color ${colors.length}/${numColors}: ${color}`, 'color: red; font-size: 14px;');
//             } else {
//                 console.log(`%cColor is similar to remaining colors. Discarding.`, 'color: red; font-size: 14px;');
//             }
//         });

//         console.log(`%cFinished iteration ${iteration} of color refinement.`, 'color: red; font-size: 16px;');
//         iteration++;
//     }

//     console.log('%cFinal set of refined colors:', 'color: red; font-size: 16px;', colors);

//     return colors;
// }

// // Express endpoint to handle random color requests
// app.get('/randomColors', (req, res) => {
//     const numColors = req.query.numColors || 10;
//     console.log('Received request for random colors');
//     console.log('Number of colors requested:', numColors);

//     const randomColors = generateUniqueRandomColors(numColors);

//     res.json({ randomColors });
// });



// module.exports = app;
// module.exports.handler = serverless(app);
// // // Example endpoint
// // app.get('/api/hello', (req, res) => {
// //   res.json({ message: 'Hello from Netlify!' });
// // });
// // Add this route after your other routes
// app.get('/test-redirect', function(req, res) {
//   res.redirect('https://www.example.com'); // Change the URL to a test destination
// });

// }