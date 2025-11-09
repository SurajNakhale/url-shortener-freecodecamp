require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
let bodyParse = require('body-parser')
const dns = require('dns');
const { URL } = require('url');


// Basic Configuration
mongoose.connect(process.env.DB_URL);
const port = process.env.PORT || 3000;

const urlSchema = new mongoose.Schema({
  original_url: {type: String, required: true},
  short_url: {type: Number}
})

const urlModel = mongoose.model("Url", urlSchema);

app.use(cors());

//middleware request to pase post request
app.use('/', bodyParse.urlencoded({ extended: false }));


app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async function (req, res) {
  const inputUrl = req.body.url;

  try {
    const urlObj = new URL(inputUrl);

    // Check protocol
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    dns.lookup(urlObj.hostname, async (err, address) => {
      if (err || !address) {
        return res.json({ error: 'invalid url' });
      }

      try {
        // Check if already exists
        const existing = await urlModel.findOne({ original_url: urlObj.href });
        if (existing) {
          return res.json({
            original_url: existing.original_url,
            short_url: existing.short_url
          });
        }

        // Find last short_url
        const latest = await urlModel.findOne().sort({ short_url: -1 }).exec();
        const nextShort = latest ? latest.short_url + 1 : 1;

        const newUrl = new urlModel({
          original_url: urlObj.href,
          short_url: nextShort
        });

        const saved = await newUrl.save();

        return res.json({
          original_url: saved.original_url,
          short_url: saved.short_url
        });
      } catch (dbErr) {
        console.error(dbErr);
        return res.status(500).json({ error: 'database error' });
      }
    });
  } catch {
    return res.json({ error: 'invalid url' });
  }
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const short = Number(req.params.short_url);

  try {
    const found = await urlModel.findOne({ short_url: short });
    if (found) {
      return res.redirect(found.original_url);
    } else {
      return res.json({ error: 'No short URL found for the given input' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'database error' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
