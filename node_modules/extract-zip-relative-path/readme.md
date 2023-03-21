# extract-zip-relative-path

Forked from original extract-zip by maxogden. Created this package to allow Relative paths as target.

In Original extract-zip you can't use like follow:

```
"scripts": {
    "extract-my-files": "extract-zip ./my-images.zip ./src/assets",
},
```

giving this error:

error! Error: Target directory is expected to be absolute

But using extract-zip-relative-path you will be able to extract your zip file at any relative path.

THIS CHANGE IS NOT TESTED, NOT SURE WHY THIS CHECK WAS THERE WHICH I COMMENTED OUT :P

```
module.exports = async function (zipPath, opts) {
  debug('creating target directory', opts.dir)

  // if (!path.isAbsolute(opts.dir)) {
  //   throw new Error('Target directory is expected to be absolute')
  // }

  await fs.mkdir(opts.dir, { recursive: true })
  opts.dir = await fs.realpath(opts.dir)
  return new Extractor(zipPath, opts).extract()
}
```

Unzip written in pure JavaScript. Extracts a zip into a directory. Available as a library or a command line program.

Uses the [`yauzl`](http://npmjs.org/yauzl) ZIP parser.

[![NPM](https://nodei.co/npm/extract-zip.png?global=true)](https://npm.im/extract-zip)
[![Uses JS Standard Style](https://cdn.jsdelivr.net/gh/standard/standard/badge.svg)](https://github.com/standard/standard)
[![Build Status](https://github.com/maxogden/extract-zip/workflows/CI/badge.svg)](https://github.com/maxogden/extract-zip/actions?query=workflow%3ACI)

## Installation

Make sure you have Node 10 or greater installed.

Get the library:

```
npm install extract-zip --save
```

Install the command line program:

```
npm install extract-zip -g
```

## JS API

```javascript
const extract = require("extract-zip");

async function main() {
  try {
    await extract(source, { dir: target });
    console.log("Extraction complete");
  } catch (err) {
    // handle any errors
  }
}
```

### Options

- `dir` (required) - the path to the directory where the extracted files are written
- `defaultDirMode` - integer - Directory Mode (permissions), defaults to `0o755`
- `defaultFileMode` - integer - File Mode (permissions), defaults to `0o644`
- `onEntry` - function - if present, will be called with `(entry, zipfile)`, entry is every entry from the zip file forwarded from the `entry` event from yauzl. `zipfile` is the `yauzl` instance

Default modes are only used if no permissions are set in the zip file.

## CLI Usage

```
extract-zip foo.zip <targetDirectory>
```

If not specified, `targetDirectory` will default to `process.cwd()`.
