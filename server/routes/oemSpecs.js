const express = require('express');
const { decode } = require('querystring');


const router = express.Router();

module.exports = (pool) => {
  // Route to test the specs route
  router.get('/', (req, res) => {
    res.send('Specs route working!');
  });


// Route to fetch car specs
router.get('/specs/:brand/:model/:year', (req, res) => {
  const { brand, model, year } = req.params;

  // Query to fetch car specs from the oem_specs table
  const selectSpecsQuery = `
    SELECT * FROM mydb.oem_specs
    WHERE brand = ? AND model = ? AND year = ?
  `;

  // Execute the query
  pool.query(selectSpecsQuery, [brand, model, year], (error, results) => {
    if (error) {
      console.error('Error fetching car specs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'Car specs not found' });
      return;
    }

    const carSpecs = results[0];

    res.json(carSpecs);
  });
});
  // Route to fetch the total number of entries in the oem_specs table
  router.get('/count', (req, res) => {
    // Query to fetch the count of entries from the oem_specs table
    const countQuery = 'SELECT COUNT(*) AS total FROM mydb.oem_specs';

    // Execute the query
    pool.query(countQuery, (error, results) => {
      if (error) {
        console.error('Error fetching count of entries:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      const totalCount = results[0].total;

      res.json({ total: totalCount });
    });
  });

    // Route to fetch all items from the oem_specs table
    router.get('/all', (req, res) => {
      // Query to fetch all items from the oem_specs table
      const selectAllQuery = 'SELECT * FROM mydb.oem_specs';
  
      // Execute the query
      pool.query(selectAllQuery, (error, results) => {
        if (error) {
          console.error('Error fetching all items:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        res.json(results);
      });
    });
  return router;
};
