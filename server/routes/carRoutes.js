const express = require('express');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Set up multer storage for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});

const upload = multer({ storage });

module.exports = (pool) => {
  // Route to add a car
  router.post('/add', upload.single('image'), authenticate, (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://buyc-ssd.netlify.app/');
    const { title, description, brand, model, year } = req.body;
    const image = req.file.filename;

    // Retrieve the userId from the decoded token
    const { userId } = req.user;

    // Execute the SQL query to insert the car details into the used_cars table
    const insertCarQuery = `
      INSERT INTO used_cars (userId, image, title, description, brand, model, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [userId, image, title, description, brand, model, year];

    pool.query(insertCarQuery, values, (err) => {
      if (err) {
        console.error('Error inserting car details:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      res.json({ message: 'Car added successfully' });
    });
  });

  // Route to delete a car
  router.delete('/delete/:carId', authenticate, (req, res) => {
        res.header('Access-Control-Allow-Origin', 'https://buyc-ssd.netlify.app/');

    const { carId } = req.params;

    // Execute the SQL query to delete the car from the used_cars table
    const deleteCarQuery = 'DELETE FROM used_cars WHERE id = ?';

    pool.query(deleteCarQuery, [carId], (err, result) => {
      if (err) {
        console.error('Error deleting car:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Car not found' });
        return;
      }

      res.json({ message: 'Car deleted successfully' });
    });
  });
  // Route to delete multiple cars
  router.delete('/delete-multiple', authenticate, (req, res) => {
        res.header('Access-Control-Allow-Origin', 'https://buyc-ssd.netlify.app/');

    const { carIds } = req.body;

    // Convert the carIds to an array if it's a single value
    const ids = Array.isArray(carIds) ? carIds : [carIds];

    // Execute the SQL query to delete the cars from the used_cars table
    const deleteCarsQuery = 'DELETE FROM used_cars WHERE id IN (?)';

    pool.query(deleteCarsQuery, [ids], (err, result) => {
      if (err) {
        console.error('Error deleting cars:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      res.json({ message: 'Cars deleted successfully' });
    });
  });

  // Route to edit a car
  router.put('/edit/:carId', upload.single('image'), authenticate, (req, res) => {
        res.header('Access-Control-Allow-Origin', 'https://buyc-ssd.netlify.app/');

    const { carId } = req.params;
    const { title, description, brand, model, year } = req.body;
    const image = req.file ? req.file.filename : null;

    // Execute the SQL query to update the car details in the used_cars table
    const updateCarQuery = `
      UPDATE used_cars
      SET image = COALESCE(?, image), title = ?, description = ?, brand = ?, model = ?, year = ?
      WHERE id = ?
    `;
    const values = [image, title, description, brand, model, year, carId];

    pool.query(updateCarQuery, values, (err, result) => {

      if (err) {
        console.error('Error updating car details:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Car not found' });
        return;
      }

      res.json({ message: 'Car updated successfully' });
    });
  });

  // Helper function to get a specific car by ID
  function getCarById(carId, callback) {
    // Execute the SQL query to retrieve the car from the used_cars table
    const getCarQuery = 'SELECT * FROM used_cars WHERE id = ?';

    pool.query(getCarQuery, [carId], (err, results) => {
      if (err) {
        console.error('Error retrieving car:', err);
        callback(err, null);
        return;
      }

      if (results.length === 0) {
        callback(null, null);
        return;
      }

      const car = results[0];
      callback(null, car);
    });
  }

// Route to get a specific car by ID
router.get('/:carId', (req, res) => {
      res.header('Access-Control-Allow-Origin', 'https://buyc-ssd.netlify.app/');

  const { carId } = req.params;

  getCarById(carId, (err, car) => {
    if (err) {
      console.error('Error retrieving car:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (!car) {
      res.status(404).json({ error: 'Car not found' });
      return;
    }

    // Append the image URL to the car object
    const imageUrl = `/uploads/${car.image}`;
    car.imageUrl = imageUrl;

    res.json(car);
  });
});

  // Route to get all cars
// Route to get all cars
router.get('/', (req, res) => {
      res.header('Access-Control-Allow-Origin', 'https://buyc-ssd.netlify.app/');

  // Execute the SQL query to retrieve all cars from the used_cars table
  const getAllCarsQuery = 'SELECT id,userId, title, description, brand, model, year, CONCAT(?, image) AS imageUrl FROM used_cars';
  const baseUrl = '/uploads/';

  pool.query(getAllCarsQuery, [baseUrl], (err, results) => {
    if (err) {
      console.error('Error retrieving cars:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(results);
  });
});


  // Middleware to authenticate incoming requests
  function authenticate(req, res, next) {
    // Retrieve the JWT token from the cookie
    const token = req.cookies.token;

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
