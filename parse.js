const urlFile = 'urls.json'
const outputDir = './output'

const jsonfile = require('jsonfile');
const csv = require('csvtojson');
const _ = require('lodash');
const math = require('mathjs');
const fs = require('fs');
const request = require('request');

jsonfile.readFile(urlFile, 'utf8', function (err,obj) {
  if (err) {
    return console.log(err);
  }
  _.each(obj.inputFiles,function(jsonurl){
    downloadCsv(jsonurl, function(response){
      csvToObj(response,function(){
        calcMedianTemp();
        calcStdDeviationTemp();
      });
    });
  });

});

/*
 * Function to download CSV from url,
 * Returns body of request
 */
function downloadCsv(url,cb) {
  console.log('Downloading ',url);
  request(url,function(error, response, body) {
    if (response.statusCode != 200) {
      console.log('Error:',error);
    } else {
      cb(body);
    }
  });
}

/*
 * Function to convert CSV to JS object
 */
function csvToObj(str,cb) {
  var set = []
  csv().fromString(str)
  .on('json',(jsonObj, rowIndex)=>{ // called on each row
      set.push(jsonObj);
  })
  .on('done',()=>{ // called when done
      this.set = set;
      cb();
  })
}

/*
 * Function to map temperature data to array
 * and calculate median
 */
function calcMedianTemp() {
  var median = getMedian( _.map(this.set, function(x){ return x['Temperature']; }) );
  //var median = getMedian( [1,2,3] );
  //console.log(_.map(this.set,function(x){ return x['Temperature']; }));
  console.log(median);
}

/*
 * Calculate median from array
 * https://github.com/Delapouite/lodash.math/blob/master/lodash.math.js
 */
function getMedian(arr) {
  arr = arr.slice(0);
  var middle = (arr.length + 1) / 2;
  var sorted = math.sort(arr);
  return (sorted.length % 2) ? sorted[middle - 1] : (sorted[middle - 1.5] + sorted[middle - 0.5]) / 2;
}

/*
 * Function to map temperature data to array
 * and calculate standard deviation
 */
function calcStdDeviationTemp() {
  var stdDev = stdDeviation( _.map(this.set,function(x){ return x['Temperature']; }) );
  console.log('sd:'+stdDev);
}

/*
 * Calculate standard deviation from array
 * https://gist.github.com/venning/b6593f965773985f923f
 */
function stdDeviation(arr){
  return Math.sqrt( getVariance(arr) );
}

function getVariance(arr){
  var avg = mean(arr);
  return _(arr).map( function(x) { return Math.pow(x-avg,2); } ).mean();
}

function mean(arr){
  return _.sum(arr.map(Number))/_.size(arr);
}
