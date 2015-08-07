'use strict';

var fs = require('fs-extra');
var t = require('chai').assert;
var s = require('./support');

describe('seed', function () {

  var app;

  beforeEach(function () {
    app = s.createApp();
  });

  describe('app.plant', function () {
    it('should plant sample data', function (done) {
      app.seed(__dirname + '/fixtures/seeds', function () {
        app.models.User.find(function (err, users) {
          if (err) return done(err);
          t.lengthOf(users, 1);
          done();
        });
      });
    });
  });

  describe('tools.plant', function () {
    it('should plant sample data', function (done) {
      app.set('seeds', __dirname + '/fixtures/seeds');
      app.tools.seed(app, ['plant'], function () {
        app.models.User.find(function (err, users) {
          if (err) return done(err);
          t.lengthOf(users, 1);
          done();
        });
      });
    });
  });

  describe('tools.harvest', function () {
    it('should harvest from data base', function (done) {
      var dir = __dirname + '/temp';
      fs.ensureDirSync(dir + '/development');
      app.seed(__dirname + '/fixtures/seeds', function () {
        app.set('seeds', dir);
        app.tools.seed(app, ['harvest'], function () {
          fs.existsSync(dir + '/development/User.js');
          fs.removeSync(dir);
          done();
        });
      });
    });
  });
});
