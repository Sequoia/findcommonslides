'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var dir = require('node-dir');
var path = require('path');
var R = require('ramda');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var l = console.log.bind(console);

var numFilenames = R.compose(R.prop('length'), R.prop('filenames'));
var sortByFilenameCount = R.compose(R.reverse, R.sortBy(numFilenames));

//a:slides [{s:text,a:filenames}]
var slides = [];

var base = '/Users/sequoia/strongloop/training.strongloop.com/public/presentations/';
var options = {
  match: /\.md$/,
  excludeDir: [/modules/, /landing-pages/]
};
var files = getFiles(base, options);

files.map(function (file) {
  return R.zipObj(['name', 'contents'], [path.relative(base, file[0]), file[1]]);
}).map(splitSlides).reduce(aggregateSlides, []).filter(function (slide) {
  return slide.filenames.length > 4;
}).then(sortByFilenameCount).then(function (slides) {
  return fs.writeFileAsync('/Users/sequoia/slides.json', (0, _stringify2.default)(slides), 'utf8');
});
//.then(l);

//sort slides by slide.filename.length
//output list of top slides and filenames
//-> into json file
function sortByFileCount(slides) {}
function aggregateSlides(slides, file) {
  file.slides.map(function (slide) {
    R.ifElse(R.lte(0),
    //if exists, add filename
    function (index) {
      return slides[index].filenames.push(file.name);
    },
    //else, create new entry & add filename
    function (index) {
      return slides.push({ text: slide, filenames: [file.name] });
    })(R.findIndex(R.propEq('text', slide))(slides)); //search for slide in slides list
  });
  return slides;
}
function splitSlides(file) {
  file.slides = file.contents.split('---') //split up into slides
  .map(function (text) {
    return text.replace(/(\r|\n)+/g, '');
  }); //strip newlines @TODO fix this
  return file;
}
function getFiles(root, options) {
  var contents = [];
  return new Promise(function (resolve, reject) {
    dir.readFiles(root, options, function (err, content, next) {
      if (err) throw err;
      contents.push(content);
      next();
    }, function (err, files) {
      if (err) return reject(err);
      console.log('finished reading files');
      resolve(R.zip(files, contents));
    });
  });
}
//function (slides