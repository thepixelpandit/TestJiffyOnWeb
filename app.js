// Import Statements? - Sorta

const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const path = require("path"); // Import the 'path' module to handle file paths.
const { initializeApp } = require("firebase/app"); // Import the initializeApp function
// Using CommonJS syntax to import necessary functions
const {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} = require("firebase/auth");
const { getDatabase, ref, set, push } = require("firebase/database");
const { dataSorter, toTitleCase } = require("./public/importantFunctions.js");

// GLOBAL VARIABLES START

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Access the allowed emails as an array
const allowedEmails = process.env.ALLOWED_EMAILS.split(",");
let user;
let userAlive;
const port = 5000;

// GLOBAL VARIABLES END

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

app.use(bodyParser.urlencoded({ extended: true }));

// Define the static file directory (public) before defining routes.
app.use(express.static(path.join(__dirname, "/public")));

// THE GETTING OF WEB PAGES

// Function to serve HTML files from the "public" folder
function serveHTMLFile(req, res, fileName) {
  const filePath = path.join(__dirname, "public", fileName);
  res.sendFile(filePath);
}

app.get("/", (req, res) => {
  serveHTMLFile(req, res, "index.html");
});

app.get("/register(.html)?", (req, res) => {
  serveHTMLFile(req, res, "signUpFirebase.html");
});

app.get("/forgotpassword(.html)?", (req, res) => {
  serveHTMLFile(req, res, "forgotPassword.html");
});

app.get("/timelogger(.html)?", (req, res) => {
  console.log(userAlive);
  if (userAlive) {
    serveHTMLFile(req, res, "timelogger.html");
  } else {
    res.send(
      '<script>alert("You are not authorized to view this page.!"); window.location.href = "/";</script>'
    );
  }
});

app.get("/success(.html)?", (req, res) => {
  serveHTMLFile(req, res, "success.html");
});

app.get("/logout", (req, res) => {
  signOut(auth)
    .then(() => {
      res.redirect("/");
    })
    .catch((error) => {
      res.send(
        '<script>alert("Sign Out Failed.!"); window.location.href = "/";</script>'
      );
    });
});

// THE POSTING ON WEB PAGES

app.post("/register", (req, res) => {
  // Access the form data
  const email = req.body.email;
  const password = req.body.password;
  const displayName = req.body.displayName.trim();

  if (allowedEmails.includes(email)) {
    // Email is in the allowed list; proceed with registration
    // Register the user using Firebase client SDK
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // User signed up successfully
        user = userCredential.user;

        // Set the display name (assuming displayName is in the request body)
        if (displayName) {
          updateProfile(auth.currentUser, {
            displayName: displayName,
          })
            .then(() => {
              console.log("User's display name set to:", displayName);
            })
            .catch((error) => {
              console.error("Error setting display name:", error);
            });
        }

        console.log("Creation of the new user is successful.");

        sendEmailVerification(user)
          .then(() => {
            console.log("Email verification sent.");
          })
          .catch((error) => {
            console.error("Error sending email verification:", error);
          });

        // Send an alert to the client and stay on the current page
        res.send(
          '<script>alert("Account Creation Successful. Welcome!"); window.location.href = "/";</script>'
        );
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
        console.log(errorCode);
        const alertMessage = `<script>alert("Account Creation Failed. Sorry! The error code was: ${errorCode}"); window.location.href = "/register";</script>`;
        res.send(alertMessage);
      });
  } else {
    // Email is not in the allowed list, reject the registration
    res.send(
      '<script>alert("Sorry, You were denied. Please contact the developer."); window.location.href = "/register";</script>'
    );
  }
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  if (allowedEmails.includes(email)) {
    const email = req.body.email;
    const password = req.body.password;
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        user = userCredential.user;
        console.log("Login of the user is successful.");
        res.redirect("/timelogger");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
        console.log(error);
      });
  } else {
    // Email is not in the allowed list, reject the registration
    res.send(
      '<script>alert("Sorry, You were denied. Please contact the developer."); window.location.href = "/";</script>'
    );
  }
});

app.post("/forgotpassword", (req, res) => {
  const email = req.body.email;
  if (allowedEmails.includes(email)) {
    const email = req.body.email;
    sendPasswordResetEmail(auth, email)
      .then(() => {
        console.log(" Reset Email has been sent.");
        res.send(
          '<script>alert("Reset Email has been sent!"); window.location.href = "/";</script>'
        );
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(" Reset Email could not be sent.");
        console.log(error);
        // res.send('<script>alert("Sign Out Failed.!"); window.location.href = "/";</script>');
        res.send('<script>alert("Reset Email could not be sent!")</script>');
      });
  } else {
    // Email is not in the allowed list, reject the registration
    res.send(
      '<script>alert("Sorry, You were denied. Please contact the developer."); window.location.href = "/";</script>'
    );
  }
});

app.post("/logout", (req, res) => {
  signOut(auth)
    .then(() => {
      res.redirect("/");
    })
    .catch((error) => {
      res.send(
        '<script>alert("Sign Out Failed.!"); window.location.href = "/";</script>'
      );
    });
});

app.post("/timelogger", (req, res) => {
  const obj = dataSorter(req.body);

  DatabaseWrite(obj)
    .then((stuts) => {
      if (stuts === true) {
        // Redirect to a success page
        res.redirect("/success");
      } else {
        console.log("Failed to successfully post your data.");
        // Handle the error as needed
        res.status(500).send("Failed to post data"); // Respond with an error message
      }
    })
    .catch((error) => {
      console.error("Failed to successfully post your data:", error);
      // Handle the error as needed
      res.status(500).send("Failed to post data"); // Respond with an error message
    });
});

auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User is signed in");
    userAlive = true;
  } else {
    // User is signed out
    console.log("User is signed out");
    userAlive = false;
    app.get("/");
  }
});

// DATABASE MANAGEMENT START

function writeUserData(userId, email) {
  set(ref(db, "users/" + userId), {
    email: email,
  });
  console.log(" Wrote the data.");
}

function DatabaseWrite(payload) {
  return new Promise((resolve, reject) => {
    // const user = auth.currentUser; // Check if the user is logged in
    if (user) {
      const studyLogListRef = ref(db, `studyLogs/${user.uid}`);
      const newPostRef = push(studyLogListRef);

      set(newPostRef, payload)
        .then(() => {
          console.log("Data updated successfully");
          resolve(true); // Resolve the Promise with true on success
        })
        .catch((error) => {
          console.error("Data update error:", error);
          reject(false); // Reject the Promise with false on error
        });
    } else {
      console.log("User is not signed in.");
      reject(false); // Reject the Promise if the user is not signed in
    }
  });
}

// DATABASE MANAGEMENT END

app.use((req, res) => {
  serveHTMLFile(req, res, "error404.html");
});

// Listen on port 5000
app.listen(process.env.port || port, () => {
  console.log(`Server is running on port ${port}`);
});
