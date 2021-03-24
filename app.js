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

app.get('/package/:name', async (req, res, next) => {
  const name = req.params.name;
  const packageData = await readFileAsync(packageFile);
  const packages = JSON.parse(packageData);
  const found=packages.find(item=>item.name==name);
  found['Readme'] = getRemoteReadme(found.repo)
  found['templatePath'] = getRemoteTemplate(found.repo, found.path)
  res.json({
    result: found || {}
  });
});



app.listen(2020, () => {
  console.log('server is listening on port 2020');
});

module.exports = app;



const splitRepo = (repo) => {
  const directRepo=repo.replace('github.com','raw.githubusercontent.com')
                       .replace('https://', '')
                       .replace('http://', '');

  const splitted=directRepo.split('/');
  const host = splitted[0];
  const thePath = splitted.slice(1).join('/')
  return { host, path:thePath}
};

const getRemoteReadme = async (repo) => {
  const { host, path} = splitRepo(repo)
  const response = await axios.get(`https://${host}/${path}/Readme`)
  logger(`status: ${response.statusCode}`)
};

const getRemoteTemplate = async (repo, templatePath) => {
  const { host, path} = splitRepo(repo)
  const response = await axios.get(`https://${host}/${path}/${templatePath}`)
  logger(`status: ${response.statusCode}`)
};

//
// (async () => {
//   try {
//     const [response1, response2] = await axios.all([
//       axios.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=2020-03-18'),
//       axios.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=2020-03-17')
//     ]);
//     console.log(response1.data.url);
//     console.log(response1.data.explanation);
//
//     console.log(response2.data.url);
//     console.log(response2.data.explanation);
//   } catch (error) {
//     console.log(error.response.body);
//   }
// })();
