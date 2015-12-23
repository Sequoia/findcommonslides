const dir = require('node-dir');
const path = require('path');
const R = require('ramda');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const l = console.log.bind(console);

const numFilenames = R.compose(R.prop('length'), R.prop('filenames'));
const sortByFilenameCount = R.compose(R.reverse, R.sortBy(numFilenames));

//a:slides [{s:text,a:filenames}]
const slides = [];

const base = '/Users/sequoia/strongloop/training.strongloop.com/public/presentations/';
const options = {
  match: /\.md$/,
  excludeDir: [/modules/, /landing-pages/]
};
const files = getFiles(base, options);

files
  .map(file => R.zipObj(['name', 'contents'], [path.relative(base, file[0]), file[1]]))
  .map(splitSlides)
  .reduce(aggregateSlides, [])
  .filter(slide => slide.filenames.length > 4)
  .then(sortByFilenameCount)
  .then(slides => fs.writeFileAsync('/Users/sequoia/slides.json', JSON.stringify(slides), 'utf8'));
  //.then(l);

//sort slides by slide.filename.length
//output list of top slides and filenames
  //-> into json file
function sortByFileCount(slides){

}
function aggregateSlides(slides, file){
  file.slides.map(function(slide){
    R.ifElse(
      R.lte(0),
      //if exists, add filename
      index => slides[index].filenames.push(file.name),
      //else, create new entry & add filename
      index => slides.push({text : slide, filenames : [ file.name ]})
    )(R.findIndex(R.propEq('text', slide))(slides)); //search for slide in slides list
  });
  return slides;
}
function splitSlides(file){
  file.slides = file.contents
    .split('---') //split up into slides
    .map(text => text.replace(/(\r|\n)+/g,'')); //strip newlines @TODO fix this
  return file;
}
function getFiles(root, options){
  let contents = [];
  return new Promise((resolve, reject) => {
    dir.readFiles(root, options,
      function(err, content, next) {
        if (err) throw err;
        contents.push(content);
        next();
      },
      function(err, files){
        if (err) return reject(err);
        console.log('finished reading files');
        resolve(R.zip(files,contents));
      });
  });
}
//function (slides
