'use strict';

var dir = require('node-dir');
var path = require('path');
var R = require('ramda');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var l = console.log.bind(console);
var e = console.error.bind(console);

var numFilenames = R.compose(R.prop('length'), R.prop('filenames'));
var sortByFilenameCount = R.compose(R.reverse, R.sortBy(numFilenames));

var base = '/Users/sequoia/strongloop/training.strongloop.com/public/presentations/';
var options = {
  match: /\.md$/,
  excludeDir: ['modules', 'landing-pages']
};

getFiles(base, options).map(function (file) {
  return R.zipObj(['name', 'contents'], [path.relative(base, file[0]), file[1]]);
}).map(splitSlides).reduce(aggregateSlides, []).filter(function (slide) {
  return slide.filenames.length > 3;
})
//.then(sortByFilenameCount) //don't need to sort yet if I'm gonna group
//.map(R.prop('filenames'))
.then(groupSlides).map(R.prop('slides'))
//.then(slides => fs.writeFileAsync('/Users/sequoia/slides.json', JSON.stringify(slides), 'utf8'))
.then(l).catch(e);

//OPTION 1: build groups by deck: compile contiguous lists of slides per deck
//OPTION 2: foreach slide, check index in each deck & compare to next slide
//          in each deck, if they continue matching, build these into lists
//          ^ This option seems very complex and prone to error
function groupSlides(slides) {
  //Should this just be a different aggregateSlides?
  //NO because aggregate slides identifies duplicates then I can remove singletons
  return slides.reduce(groupByFile, []).map(function sortSlidesByIndex(file) {
    file.slides.sort(function (a, b) {
      return a.index - b.index;
    });
    return file;
  });

  function groupByFile(res, slide) {
    //in <= [{text:s, filenames:a},...]
    //out=> {name:s, slides:a}
    return slide.filenames.reduce(function (grouped, file) {
      var idx = R.findIndex(R.propEq('name', file.name))(grouped);
      if (idx === -1) {
        grouped.push({ name: file.name, slides: [] });
        idx = grouped.length - 1;
      }
      grouped[idx].slides.push({ text: slide.text, index: file.index });
      return grouped;
    }, res);
  }
}

function aggregateSlides(slides, file) {
  file.slides.map(function (slide) {
    R.ifElse(R.lte(0),
    //if exists, add filename
    function (index) {
      return slides[index].filenames.push({ name: file.name, index: slide.index });
    },
    //else, create new entry & add filename
    function (index) {
      return slides.push({ text: slide.text, filenames: [{ name: file.name, index: slide.index }] });
    })(R.findIndex(R.propEq('text', slide.text))(slides)); //search for slide in slides list
  });
  return slides;
}
function splitSlides(file) {
  file.slides = file.contents.split('---') //split up into slides
  .map(function (text, index) {
    text = text.replace(/(\r|\n)+/g, ''); //strip newlines @TODO fix this
    return { text: text, index: index };
  }).filter(R.compose(R.not, R.whereEq({ text: '# fin' }))); //remove "fin" slides
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