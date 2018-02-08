# Alabama Legals Scraper

[![Build Status](https://travis-ci.org/tinta/ALLegalsScraper.svg?branch=master)](https://travis-ci.org/tinta/ALLegalsScraper)

## Install

1) Install [electron](https://electronjs.org/) system requirements (required for [nightmare.js](https://github.com/segmentio/nightmare))
```
apt-get install -y libgtk2.0-0 libgconf-2-4 \
    libasound2 libxtst6 libxss1 libnss3 xvfb
```
2) Run `npm install`

## Usage

Allow access to data interface on port 3000
`npm run start`

Run scraper (takes a couple of minutes)
`npm run scraper`

## Production

`forever start app/index.js`

## Debugging

Electron and nightmare have a lot of dependencies and are sometimes buggy. To debug the installation of these requirements, use the debug flag.

```
DEBUG=nightmare* node scraper/index.js
```

If node is throwing weird errors, check the version and ensure the correct one is in use.

```
node --version
nvm use
```

## About

This is basically a project for my mom, and likely not useful to anyone else on the internet, except as a case study in writing frontend scrapers for shitty websites.
