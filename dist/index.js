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
.then(groupSlides).then(clumpSlides).map(dropClumpsSmallerThan(2)).filter(function (file) {
  return file.clumps.length > 0;
}) //drop files with no clumps
//.map(R.prop('clumps')) .then(slides => slides.slice(0,3)) .map(l) //examine some slides
.map(writeModuleFiles).catch(e);

function writeModuleFiles(file) {
  var basepath = '/Users/sequoia/modules/';
  file.clumps.map(function (clump, index) {
    var name = path.join(basepath, file.name.replace('/', '__') + '.' + index);
    var contents = clump.map(R.prop('text')).join('\n\n---\n\n');
    return fs.writeFileAsync(name, contents);
  });
}

function dropClumpsSmallerThan(len) {
  return function (file) {
    file.clumps = file.clumps.filter(function (clump) {
      return clump.length > len;
    });
    return file;
  };
}
function clumpSlides(files) {
  return files.map(function (file) {
    var lastSlideIndex = -2;
    var clumpIndex = -1;
    file.clumps = file.slides.reduce(function (clumps, slide) {
      if (slide.index === lastSlideIndex + 1) {
        //it's the next in the sequence
        clumps[clumpIndex].push(slide);
      } else {
        clumps[++clumpIndex] = [slide];
      }
      lastSlideIndex = slide.index;
      return clumps;
    }, []);
    return file;
  });
}
/**
 * groups slides into file objects: {name:String, slides:[text, index]}
 * also sorts slides by index
 */
function groupSlides(slides) {
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