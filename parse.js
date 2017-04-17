const urlFile = 'urls.json'
const outputDir = './output'

const jfile = require('jsonfile');
const csv = require('csvtojson');
const _= require('lodash');
const fs = require('fs');
const request = require('request');

jfile.readFile(urlFile, 'utf8', function (err,obj) {
  if (err) {
    return console.log(err);
  }

  _.each(obj.inputFiles,downloadCsv);

});

function downloadCsv(url) {
  console.log('Downloading ',url);
  request(url,function(error, response, body) {
    if (response.statusCode != 200) {
      console.log('Error:',error);
    } else {
      csv()
      .fromString(body)
      .on('csv',(csvRow)=>{ // this func will be called 3 times
          console.log(csvRow) // => [1,2,3] , [4,5,6]  , [7,8,9]
      })
      .on('done',()=>{
          console.log('Finished Parsing')
      })
    }
  });
}
