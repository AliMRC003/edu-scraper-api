const fs = require('fs');
const JSONStream = require('JSONStream');
const es = require('event-stream');

async function processFile() {
  const inputFile = 'output.json';
  const outputFile = 'output.small.json';

  console.log(`Reading from ${inputFile} and writing to ${outputFile}...`);

  const readStream = fs.createReadStream(inputFile);
  const writeStream = fs.createWriteStream(outputFile);

  writeStream.write('[\n');

  let isFirst = true;

  const pipeline = readStream
    .pipe(JSONStream.parse('*'))
    .pipe(es.mapSync(function(data) {
        const newObject = {
            domain: data.domain,
            url: data.url,
            title: data.title,
            extractionMethod: data.extractionMethod
        };
        
        if (!isFirst) {
            writeStream.write(',\n');
        }
        writeStream.write(JSON.stringify(newObject, null, 2));
        isFirst = false;
    }));

  return new Promise((resolve, reject) => {
    pipeline.on('end', () => {
      writeStream.write('\n]\n');
      writeStream.end();
      console.log('Processing complete.');
      resolve();
    });
    pipeline.on('error', (err) => {
        console.error("Error during processing:", err);
        reject(err);
    });
  });
}

processFile(); 