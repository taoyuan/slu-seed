'use strict';

var debug = require('debug')('slu:tools:seed');
var async = require('async');
var path = require('path');
var fs = require('fs');
var Module = require('module');

module.exports = function (app, action, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  if (typeof options === 'string') {
    options = {seeds: options};
  }
  options = options || {};

  var seed = new Seed(app);

  seed.on('complete', callback || function () {
      process.exit();
    });

  var root = app.root || process.cwd();
  var seedsDir = options.seeds;
  if (!seedsDir) {
    seedsDir = path.join(root, '/db/seeds/');
    if (!fs.existsSync(seedsDir)) {
      seedsDir = path.join(root, '/server/db/seeds/');
    }
    if (!fs.existsSync(seedsDir)) {
      console.error('Can not find seeds path from: \n1) `seeds` env variable; \n2) [root]/db/seeds; \n3) [root]/server/db/seeds');
      throw new Error('Can not find seeds path');
    }
  }

  var seedPath = path.join(seedsDir, app.get('env'));

  switch (action) {
    default:
    case 'plant':
    case 'read':
      seed.plant(app, seedPath);
      break;
    case 'harvest':
    case 'write':
      seed.harvest(app, seedPath);
      break;
  }
};

function Seed(app) {
  var that = this;
  var queue = [];

  var baseModel, extendedModel;
  for (var name in app.models) if (app.models.hasOwnProperty(name)) {
    baseModel = app.models[name];
    extendedModel = app.loopback.getModelByType(baseModel);
    baseModel.seed = getSeedMethod(baseModel);
    if (baseModel !== extendedModel) {
      extendedModel.seed = getSeedMethod(extendedModel);
    }
  }

  function getSeedMethod(Model) {
    return function seedMethod(seed) {
      if (queue.length === 0) process.nextTick(next);
      queue.push({Model: Model, seed: seed});
    };
  }

  function next() {
    var task = queue.shift();
    if (!task) return that.emit('complete');

    var Model = task.Model;
    var data = typeof task.seed === 'function' ? task.seed() : task.seed;
    if (Model.dataSource) {
      _seed(Model, data, next);
    } else {
      Model.once('dataSourceAttached', function () {
        _seed(Model, data, next);
      });
    }
  }

  function _seed(Model, data, next) {
    if (!Array.isArray(data)) data = [data];
    async.map(data, function (item, callback) {
      debug('Seed %s: %s', Model.modelName, JSON.stringify(item).substr(0, 80));
      Model.upsert(item, callback);
    }, next);
  }
}

require('util').inherits(Seed, require('events').EventEmitter);

Seed.prototype.plant = function (app, dir) {
  var loopback = app.loopback;
  var models = loopback.modelBuilder.models;

  for (var name in models) if (models.hasOwnProperty(name)) {
    if (['Model', 'PersistedModel'].indexOf(name) >= 0) continue;
    if (name.indexOf('AnonymousModel') === 0) continue;
    global[name] = loopback.getModelByType(models[name]);
    debug('inject model', name, '->', global[name].modelName);
  }
  fs.readdirSync(dir).forEach(function (file) {
    var seed = path.resolve(dir + '/' + file);
    if (file.match(/\.(coffee|js)$/)) {
      delete Module._cache[seed];
      require(seed);
    }
  });
};

Seed.prototype.harvest = function (app, file, type) {
  type = type || 'js';
  var that = this;
  var wait = 0;
  var modelNames = Object.keys(app.models);
  if (modelNames[0] && !app.models[modelNames[0]].dataSource) {
    return app.models[modelNames[0]].on('dataSourceAttached', function () {
      setTimeout(function () {
        this.harvest(app, file, type);
      }.bind(this), 1000);
    }.bind(this));
  }
  modelNames.forEach(function (modelName) {
    wait += 1;
    var Model = app.models[modelName];
    var text = '';
    Model.all(function (err, data) {
      if (err) throw err;
      data.forEach(function (d) {
        text += codify(modelName, d, type);
      });
      if (data && data.length) {
        fs.writeFileSync(file + '/' + modelName + '.' + type, text);
      }
      if (--wait === 0) {
        that.emit('complete');
      }
    });
  });

  function codify(modelName, d, type) {
    var str = modelName + '.seed({\n';
    Object.keys(d.toObject()).forEach(function (f, index, array) {
      if (d[f] === undefined) return;
      str += '  ' + escape(f) + ': ' + quote(d[f]);
      if (index !== array.length - 1) str += ',';
      str += '\n';
    });
    str += '});';
    return str + '\n';
  }

  function escape(f) {
    return f.match(/[^_a-z]/i) ? "'" + f + "'" : f;
  }

  function quote(v) {
    if (typeof v === 'string') {
      if (v.match(/\n/)) {
        return '"""\n        ' +
          v.replace(/#\{/g, '\\#{').replace(/\n/g, '\n        ') +
          '\n    """';
      } else {
        return "'" + v.replace(/'/g, '\\\'') + "'";
      }
    }
    if (v && typeof v === 'object' && v.constructor.name === 'Date') {
      return "'" + v.toString().split(' GMT')[0] + "'";
    } else if (v && typeof v === 'object') {
      return JSON.stringify(v);
    }
    return v;
  }
};
