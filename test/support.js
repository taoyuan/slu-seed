'use strict';

var _ = require('lodash');
var loopback = require('loopback');
var seedComponent = require('../');

exports.model_config = {
  "User": {
    "dataSource": "db"
  },
  "AccessToken": {
    "dataSource": "db",
    "public": false
  },
  "ACL": {
    "dataSource": "db",
    "public": false
  },
  "RoleMapping": {
    "dataSource": "db",
    "public": false
  },
  "Role": {
    "dataSource": "db",
    "public": false
  }
};

exports.createApp = function() {
  var app = loopback();
  app.dataSource('db', {connector: 'memory'});
  _.forEach(exports.model_config, function (config, name) {
    app.model(loopback.getModel(name), config);
  });
  seedComponent(app);
  return app;
};
