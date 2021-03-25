const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const Packages = require('./data/packages');

const packages = new Packages();

var app = express();
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const router = express.Router();
app.use('/api', router);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500)
    .json({ error: err.toString() });
});


router.get('/packages', async (req, res, next) => {
  try {
    const data = await packages.getAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/packages/:name', async (req, res, next) => {
  try {
    const ref = req.query.ref;
    const name = req.params.name;
    const data = await packages.getByName(name, ref);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/templates/:name', async (req, res, next) => {
  try {
    const ref = req.query.ref;
    const name = req.params.name;
    const data = await packages.download(name, ref);
    res.send(data);
  } catch (err) {
    next(err);
  }
});

router.get('/parameters', async (req, res, next) => {
  try {
    res.setHeader('Content-type', "application/octet-stream");
    res.setHeader('Content-disposition', 'attachment; filename=params.json');
    res.send(JSON.stringify(req.query))
  } catch (err) {
    next(err);
  }
});

app.listen(2020, () => {
  console.log('server is listening on port 2020');
});

module.exports = app;
