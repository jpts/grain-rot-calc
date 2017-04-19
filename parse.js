const urlFile = 'urls.json'
const outFile = 'output.json'

const jsonfile = require('jsonfile');
const csv = require('csvtojson');
const _ = require('lodash');
const math = require('mathjs');
const fs = require('fs');
const request = require('request');
const ndjson = require('ndjson');

// These were estimated by looking at the three sample
// dat sets and looking when CO2 > 0.04
const tempThreshold = 30;
const humidityThreshold = 65;

/*
 * Main function which reads from the urlFile
 * and calls all processing functions
 */
jsonfile.readFile(urlFile, 'utf8', function (err,obj) {
  // Check th file opened correctly
  if (err) {
    return console.log(err);
  }
  // Open output file
  prepNDJSON();

  // Setup counter so we can detect the last iteration of the loop
  var inputSize = obj.inputFiles.length;

  // Iterate over each url element of the json array in the input file
  _.each(obj.inputFiles,function(jsonurl,index){
    // Download the content of each url
    downloadCsv(jsonurl, function(response){
      // Convert content to a js object
      csvToObj(response,function(obj){
        // perform calculations on the retrieved data
        var med = calcMedianTemp(obj);
        var sd = calcStdDeviationTemp(obj);
        var rot = getRottingTime(obj);
        // format this data into an object and append to output file
        var jsonline = {"grainPile": index+1, "standardDeviation":sd, "median":med, "rotsAtTime":rot};
        appendToNDJSON(jsonline);
        // close file if we are in the last loop
        if (--inputSize === 0) closeNDJSON();
      });
    });
  });
});

/*
 * Function to download CSV from url,
 * Returns body of request as cb parameter
 */
function downloadCsv(url,cb) {
  console.log('Downloading',url);
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
      cb(set);
  })
}

/*
 * Function to map temperature data to array
 * and calculate median
 */
function calcMedianTemp(obj) {
  var median = getMedian( _.map(obj, function(x){ return x['Temperature']; }) );
  console.log('median:'+median);
  return median;
}

/*
 * Calculate median from array
 * https://github.com/Delapouite/lodash.math/blob/master/lodash.math.js#L15
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
function calcStdDeviationTemp(obj) {
  var stdDev = stdDeviation( _.map(obj,function(x){ return x['Temperature']; }) );
  console.log('stddev:'+stdDev);
  return stdDev;
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

/*
 * Function to find when the grain will rot
 * The array values are compared to threshold values set above
 * Temperature and Humidity are thresholded seperately and then the min is taken
 * NB: The first row is taken as day 0
 */
function getRottingTime(obj){
  var daysUntilHumidRot = _.findIndex(_.map(obj, function(x){ return x['Humidity']; }), function(y) {return y >= humidityThreshold;});
  var daysUntilTempRot = _.findIndex(_.map(obj, function(x){ return x['Temperature']; }), function(y) {return y >= tempThreshold;});
  var days = Math.min(daysUntilHumidRot, daysUntilTempRot);
  console.log('daysToRot:'+days);
  return days;
}

/*
 * Function which sets up the NDJSON library
 * with a stream that we can use for writing
 */
function prepNDJSON(){
  fs.writeFile(outFile,'');
  this.serialize = ndjson.serialize();
  this.serialize.on('data', function(line) {
    fs.appendFile(outFile, line, function (err) {
      if (err){
        console.log('Error appending to outFile');
      }
    });
  });
}

/*
 * Function which uses the NDJSON stream
 * for writing the output json file
 */
function appendToNDJSON(json){
  this.serialize.write(json);
}

/*
 * Function to close json file properly
 */
function closeNDJSON(){
  this.serialize.end();
  console.log('File written:'+outFile);
}
