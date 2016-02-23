# Alabama Legals Scraper

[![Build Status](https://travis-ci.org/tinta/ALLegalsScraper.svg?branch=master)](https://travis-ci.org/tinta/ALLegalsScraper)

## Install

1) The `phantomjs` binary is required. For you `brew` users, running `brew install phantomjs` will do the trick.

2) Run `npm install`.

## Usage

`npm start`
Allows access to data interface on port 3000

`npm run scraper`
Runs scraper (takes a couple of minutes)

## Production

`forever start app/index.js`
