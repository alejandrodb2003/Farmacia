const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('deploy.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Ignore node_modules, .git
archive.glob('**/*', {
  cwd: __dirname,
  ignore: ['**/node_modules/**', '**/.git/**', 'deploy.zip', 'dev.db']
});

archive.finalize();
