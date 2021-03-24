const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const fs = require('fs');
const { promisify } = require('util')
const Packages = require('./data/packages')

const packages = new Packages();
const readFileAsync = promisify(fs.readFile)

var app = express();
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/packages', async (req, res, next) => {
  const result = await packages.getAll()
  res.json({
    result: result
  });
});

app.get('/packages/:name', async (req, res, next) => {
  const name = req.params.name;
  const found = await packages.getByName(name);
  res.json({
    result: found || {}
  });
});

app.get('/templates/:name', async (req, res, next) => {
  try {
    const ref=req.query.ref;
    const name = req.params.name;
    const found = await packages.download(name, ref);
    res.json({
      result: found || {}
    });
  } catch(err) {
      next(err);
  }
});



app.listen(2020, () => {
  console.log('server is listening on port 2020');
});

module.exports = app;
