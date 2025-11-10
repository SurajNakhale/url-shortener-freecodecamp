require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
let bodyParse = require('body-parser')
const dns = require('dns');
const { URL } = require('url')

// Basic Configuration
mongoose.connect(process.env.DB_URL);
const port = process.env.PORT || 3000;

const urlSchema = new mongoose.Schema({
  original_url: {type: String, required: true},
  short_url: {type: String}
})

const urlModel = mongoose.model("Url", urlSchema);

app.use(cors());

//middleware request to pase post request
app.use('/', bodyParse.urlencoded({ extended: false }));


app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


app.get('/api/shorturl/:short_url', async (req, res)=>{
      const short_url = req.params.short_url;
      const foundUrl = await urlModel.findOne({ short_url: short_url});
      console.log(foundUrl);
        if(foundUrl){
          let original_url = foundUrl.original_url;
          return res.redirect(original_url);
        }
        else{
          return res.json({error: "short_Url not found"})
        }
    
})


// Your first API endpoint
app.post('/api/shorturl', function(req, res) {
  
  let url = req.body.url;
  try{
    urlObj = new URL(url)
  //  console.log(urlObj)
    
  //validate host name
      dns.lookup(urlObj.hostname, async (err, address) => {
        if(err || !address){
          return res.json({ error: "invalid url" })
        }
        else{
          //if we have a valid url
          let original_url = urlObj.href;

          //search if that url already exist in the database
          const existingUrl = await urlModel.findOne({ original_url });
          if(existingUrl){
              return res.json({
                original_url: existingUrl.original_url,
                short_url: existingUrl.short_url
              })
          }
              //find latest short url
              const latestUrl = await urlModel.findOne({}).sort({short_url: -1}).exec();
              let short_url = 1;

              if(latestUrl){
                short_url = latestUrl.short_url + 1;
                console.log(short_url);
              }

              let newUrl = new urlModel({
                  original_url,
                  short_url
                });

                await newUrl.save()
                      .then(saveUrl => res.json({
                        original_url: saveUrl.original_url,
                        short_url: saveUrl.short_url
                      }));
        }
      })
    }

    catch{
      return res.json({ error: "invalid url" })
    }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
