const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const carsRoute = require('./routes/carRoutes');
const userRoutes = require('./routes/userRoutes');
const specsRoute=require('./routes/oemSpecs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const carRoutes = require('./routes/carRoutes');
require('dotenv').config();
const app = express();
app.use(cookieParser());
app.use(cors({
  origin:["http://localhost:3000"],
  credentials:true,
}))
app.use(express.json());
app.use('/uploads', express.static('uploads'));



// Create a MySQL connection pool
const pool = mysql.createPool({
  host: "database-1.chs3hfivjukn.eu-north-1.rds.amazonaws.com",
  port: "3306",
  user: "admin",
  password: "Ssd19291",
  database: "mydb",
});

// Test the database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    return;
  }
  connection.release();
  console.log('Connected to the database');
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

});


// Create the userRoutes with the pool and use it
app.use('/api/users', userRoutes(pool));
app.use('/api/oem',specsRoute(pool));
app.use('/api/used-cars',carRoutes(pool));


app.get('/test', (req, res) => {
  res.send("Test route working!");
});

