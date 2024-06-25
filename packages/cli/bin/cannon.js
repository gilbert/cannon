#!/usr/bin/env node

const { red } = require('chalk');
const { dump } = require('../dist/src/dump');
const cli = require('../dist/src');

cli.default
  .parseAsync()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    if (err.message) {
      err.message = red(err.message);
    }

    console.error(err);

    // if there is any problem, this will write program output debug output to a file before exiting
    dump();

    process.exit(1);
  });
