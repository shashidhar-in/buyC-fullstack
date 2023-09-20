const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Cookie } = require('express-session');

const router = express.Router();

// Middleware to parse cookies
router.use(cookieParser());

module.exports = (pool) => {
  router.get('/', (req, res) => {
    res.send('User route working!');
    console.log(typeof pool);
  });

  // Define the route for user signup
  router.post('/signup', (req, res) => {
    const { username, email, password, mobileNumber, location } = req.body;
    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    pool.query(checkUserQuery, [email], (error, results) => {
      if (error) {
        console.error('Error checking user existence:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      if (results.length > 0) {
        res.status(400).json({ error: 'User already exists with this email' });
        return;
      }

      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password: ', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        // Generate a unique user ID (you can use any desired method)
        const userId = generateUserId();

        // Execute the SQL query to create the users table (if it doesn't exist)
        const createUserTableQuery = `
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            mobileNumber VARCHAR(255) NOT NULL,
            location VARCHAR(255) NOT NULL
          )
        `;

        // Execute the SQL query to insert the user details into the users table
        const insertUserQuery = `
          INSERT INTO users (userId, username, email, password, mobileNumber, location)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [userId, username, email, hashedPassword, mobileNumber, location];

        // Create the users table (if it doesn't exist) and insert the user details
        pool.query(createUserTableQuery, (err) => {
          if (err) {
            console.error('Error creating users table: ', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }

          pool.query(insertUserQuery, values, (err) => {
            if (err) {
              console.error('Error inserting user details: ', err);
              res.status(500).json({ error: 'Internal Server Error' });
              return;
            }

            // Generate a JWT token
            const token = jwt.sign({ userId, username, email,mobileNumber }, process.env.JWT_SECRET);

            // Store the token in a cookie
          // Store the token in a cookie
            res.cookie('token', token, {
  sameSite: 'none',
  secure: true, // Only for HTTPS
});

            
            res.json({ message: 'User created successfully' });
          });
        });
      });
    });
  });

  // Helper function to generate a unique user ID
  function generateUserId() {
    // Implement your logic here to generate a unique user ID
    // Example: return a random 8-character alphanumeric string
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let userId = '';
    for (let i = 0; i < 8; i++) {
      userId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return userId;
  }

// User login route
router.post('/login', (req, res) => {
    // Retrieve user credentials from the request body
    const { email, password } = req.body;

    // Verify user credentials (e.g., query the database)
    // If credentials are valid, generate a JWT token
    const loginUserQuery = 'SELECT * FROM users WHERE email = ?';
    pool.query(loginUserQuery, [email], (error, results) => {
      if (error) {
        console.error('Error retrieving user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      if (results.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
  
      const user = results[0];
      const { userId, username, email, mobileNumber } = user;
  
      // Verify the password
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Error comparing passwords: ', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        if (!isMatch) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }
  
        // Generate a JWT token
        const token = jwt.sign({ userId, username, email, mobileNumber }, process.env.JWT_SECRET);
  
        // Store the token in a cookie
        // Store the token in a cookie
          res.cookie('access-token', token, {    
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
        sameSite: 'none',
      secure: process.env.NODE_ENV === "production",
});

        
        // Send a response or redirect the user
        res.json({ message: 'User logged in successfully' });
      });
    });
  });
  

  // Get current user route
  router.get('/current', authenticate, (req, res) => {
    // Access the authenticated user from req.user
    // Exclude the password from the response

    const { username, email, mobileNumber, location } = req.user;

    // Handle getting current user logic
    res.json(req.user);
  });
  // Route to get user details by user ID
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  // Execute the SQL query to retrieve user details by user ID
  const getUserQuery = 'SELECT * FROM users WHERE userId = ?';
  pool.query(getUserQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error retrieving user details:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = results[0];
    // Exclude the password from the response
    const { id, userId, username, email, mobileNumber, location } = user;

    // Send the user details in the response
    res.json({ id, userId, username, email, mobileNumber, location });
  });
});


// User logout route
router.post('/logout', (req, res) => {
try {
    res.clearCookie("access-token");

    return res.json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message);
  }
});


  // Middleware to authenticate incoming requests
  function authenticate(req, res, next) {
    // Retrieve the JWT token from the cookie
    const token = req.cookies.access-token;
    // Verify and decode the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        // Token verification failed
        res.status(401).json({ error: 'Invalid token' });
      } else {
        // Token verification successful, attach the decoded token to the request object
        req.user = decodedToken;
        next();
      }
    });
  }

  return router;
};
