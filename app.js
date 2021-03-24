const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const fs = require('fs');
const { promisify } = require('util')
const https = require('https')

const readFileAsync = promisify(fs.readFile)

const dataDir = __dirname+'/data/';
const packageFilename = 'packages.json';
const packageFile = `${dataDir}//${packageFilename}`;

var app = express();
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/packages', (req, res, next) => {
  const filename = packageFilename;
  const options = {
      root: dataDir,
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      },
    };

    res.sendFile(filename, options, function (err) {
      if (err) {
        next(err)
      } else {
        logger('Sent:', filename)
      }
    })
  });


app.get('/package/:name', async (req, res, next) => {
  const name = req.params.name;
  const packageData = await readFileAsync(packageFile);
  const packages = JSON.parse(packageData);
  const found=packages.find(item=>item.name==name);
  found['templatePath'] = getRemoteTemplate(found.repo, found.path)
  res.json({
    result: found || {}
  });
});



app.listen(2020, () => {
  console.log('server is listening on port 2020');
});

module.exports = app;



const getRemoteTemplate = async (repo, path) => {
  repo.split();
  const directRepo=repo.replace('github.com','raw.githubusercontent.com')
                       .replace('https://', '')
                        .replace('http://', '');

  const fullPath = `${directRepo}/${path}`;
  const splitted=fullPath.split('/');
  const host = splitted[0];
  const thePath = splitted.slice(1).join('/')
  await axios.all
  const options = {
    hostname: host,
    port: 443,
    path: thePath,
    method: 'GET'
  };
  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`)

    // res.on('data', d => {
    //   process.stdout.write(d)
    // })
  })

};


(async () => {
  try {
    const [response1, response2] = await axios.all([
      axios.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=2020-03-18'),
      axios.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=2020-03-17')
    ]);
    console.log(response1.data.url);
    console.log(response1.data.explanation);

    console.log(response2.data.url);
    console.log(response2.data.explanation);
  } catch (error) {
    console.log(error.response.body);
  }
})();
