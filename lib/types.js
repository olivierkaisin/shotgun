module.exports = {
  'iphone' : {
    /* jshint maxlen:120 */
    userAgent: 'Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+',
    screenSize: { width: 320, height: 536 },
    innerHeight: 536,
    crop: { width: 252, height: 439 },
    resize: { width: 252, height: 439 }
  },
  'desktop-large' : {
    screenSize: { width: 1280, height: 965 },
    innerHeight: 965,
    crop: { width: 1280, height: 965 },
    resize: { width: 630, height: 475 }
  },
  'desktop-small' : {
    screenSize: { width: 1056, height: 600 },
    innerHeight: 600,
    crop: { width: 528, height: 300 },
    resize: { width: 528, height: 300 }
  }
};
