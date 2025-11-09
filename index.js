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


app.get('/api/shorturl/:short_url', (req, res)=>{
      const short_url = req.params.short_url;

      urlModel.findOne({ short_url: short_url}).then((foundUrl) =>{
        console.log(foundUrl);

        if(foundUrl){
          let original_url = foundUrl.original_url;
          res.redirect(original_url);
        }
        else{
          return res.json({message: "short_Url not found"})
        }
      })
})


// Your first API endpoint
app.post('/api/shorturl', function(req, res) {
  let url = req.body.url;


  try{
    urlObj = new URL(url)
  //  console.log(urlObj)
      dns.lookup(urlObj.hostname, async (err, address) => {
        if(err || !address){
          return res.json({
            error: "invalid url"
          })
        }
        //if we have a valid url
          let original_url = urlObj.href;

          urlModel.findOne({original_url: original_url}).then((foundUrl)=> {
            if(foundUrl){
              return res.json({
                original_url: foundUrl.original_url,
                short_url: foundUrl.short_url
              })
            }
            else{
              try{
              const latestUrl = urlModel.findOne({}).sort({short_url: -1}).exec();
              let short_url = 1;

              if(latestUrl){
                short_url = parseInt(latestUrl.short_url) + 1;
              }

              let newUrl = new urlModel({
                  original_url,
                  short_url
                });

                newUrl.save()
                      .then(saveUrl => res.json({
                        original_url: saveUrl.original_url,
                        short_url: saveUrl.short_url
                      }))
          }
              catch(dbErr){
                console.error(dbErr);
                return res.status(500).json({ message: "Database error" });
              }
            }
          })
        
      })
  }
  catch{
    return res.json({
      error: "invalid url"
    })
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
