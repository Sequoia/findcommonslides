const dir = require('node-dir');
const path = require('path');
const R = require('ramda');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const l = console.log.bind(console);
const e = console.error.bind(console);

const numFilenames = R.compose(R.prop('length'), R.prop('filenames'));
const sortByFilenameCount = R.compose(R.reverse, R.sortBy(numFilenames));

const base = '/Users/sequoia/strongloop/training.strongloop.com/public/presentations/';
const options = {
  match: /\.md$/,
  excludeDir: ['modules', 'landing-pages']
};

getFiles(base, options)
  .map(file => R.zipObj(['name', 'contents'], [path.relative(base, file[0]), file[1]]))
  .map(splitSlides).reduce(aggregateSlides, [])
  .filter(slide => slide.filenames.length > 3)
  //.then(sortByFilenameCount) //don't need to sort yet if I'm gonna group
  //.map(R.prop('filenames'))
  .then(groupSlides)
  .then(clumpSlides)
  .map(dropClumpsSmallerThan(2))
  .filter(file => file.clumps.length > 0) //drop files with no clumps
  //.map(R.prop('clumps')) .then(slides => slides.slice(0,3)) .map(l) //examine some slides
  .all(writeModuleFiles)
  //.then(slides => fs.writeFileAsync('/Users/sequoia/slides.json', JSON.stringify(slides), 'utf8'))
  //.then(l)
  .catch(e);

function writeModuleFiles(file){
  let basepath = '/Users/sequoia/modules/';
  file.clumps.map(function(clump, index){
    let name = path.join(basepath, file.name.replace('/','__'));
    let contents = clump.map(R.prop('text')).join('\n\n---\n\n');
    return fs.writeFileAsync(name, contents);
  });
}

function dropClumpsSmallerThan(len){
  return function(file){
    file.clumps = file.clumps.filter(clump => clump.length > len);
    return file;
  };
}
function clumpSlides(files){
  return files.map(file => {
    let lastSlideIndex = -2;
    let clumpIndex = -1;
    file.clumps = file.slides.reduce((clumps, slide) => {
      if(slide.index === lastSlideIndex + 1){
        //it's the next in the sequence
        clumps[clumpIndex].push(slide);
      }else{
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
function groupSlides(slides){
  return slides.reduce(groupByFile, [])
    .map(function sortSlidesByIndex(file){
      file.slides.sort((a, b) => a.index - b.index);
      return file;
    });

  function groupByFile(res, slide){
    //in <= [{text:s, filenames:a},...]
    //out=> {name:s, slides:a}
    return slide.filenames.reduce(function(grouped, file){
      let idx = R.findIndex(R.propEq('name', file.name))(grouped);
        if(idx === -1){
          grouped.push({name: file.name, slides: []});
          idx = grouped.length - 1;
        }
        grouped[idx].slides.push({text: slide.text, index: file.index});
        return grouped;
      }, res);
  }
}

function aggregateSlides(slides, file){
  file.slides.map(function(slide){
    R.ifElse(
      R.lte(0),
      //if exists, add filename
      index => slides[index].filenames.push( {name: file.name, index: slide.index} ),
      //else, create new entry & add filename
      index => slides.push({text : slide.text, filenames : [ {name: file.name, index: slide.index} ]})
    )(R.findIndex(R.propEq('text', slide.text))(slides)); //search for slide in slides list
  });
  return slides;
}
function splitSlides(file){
  file.slides = file.contents
    .split('---') //split up into slides
    .map(function(text, index){
      text = text.replace(/(\r|\n)+/g,''); //strip newlines @TODO fix this
      return { text , index };
    })
    .filter(R.compose(R.not,R.whereEq({text: '# fin'}))); //remove "fin" slides
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
