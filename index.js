'use strict';

var seed = require('./lib/seed');

module.exports = function (app, options) {
  options = options || {};
  var tools = app.tools = app.tools || {};

  app.seed = function (dir, done) {
    if (typeof dir === 'function') {
      done = dir;
      dir = null;
    }
    dir = dir || options.seeds;
    return seed(app, 'plant', dir, done);
  };

  tools.seed = function (app, args, callback) {
    var action = args.shift() || 'plant';
    return seed(app, action, app.get('seeds'), callback);
  };

  tools.seed.help = {
    shortcut: 'sd',
    usage: 'seed plant|harvest',
    description: 'Populate database with seed data'
  };
};
