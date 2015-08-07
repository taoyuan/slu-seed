'use strict';

var debug = require('debug')('slu:tools:seed');
var path = require('path');
var fs = require('fs');
var Module = require('module');

module.exports = seed;

seed.tool = function (app, args, callback) {
  var action = args.shift() || 'plant';
  return seed(app, action, app.get('seeds'), callback);
};

seed.tool.help = {
  shortcut: 'sd',
  usage: 'seed plant|harvest',
  description: 'Populate database with seed data'
};

function seed(app, action, options, callback) {
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

  var seedPath = seedsDir + app.get('env');

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
}

function Seed(app) {
  var seed = this;
  var queue = [];

  for (var i in app.models) {
    app.models[i].seed = seedMethod;
  }

  function seedMethod(seed) {
    if (queue.length === 0) process.nextTick(next);
    queue.push({Model: this, seed: seed});
  }

  function next() {
    var task = queue.shift();
    if (!task) return seed.emit('complete');

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
    debug('Seed %s: %s', Model.modelName, JSON.stringify(data).substr(0, 80));
    Model.upsert(data, next);
  }
}

require('util').inherits(Seed, require('events').EventEmitter);

Seed.prototype.plant = function (app, dir) {
  for (var i in app.models) {
    global[i] = app.models[i];
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
      fs.writeFileSync(file + '/' + modelName + '.' + type, text);
      if (--wait === 0) {
        process.exit();
      }
    });
  });

  function codify(modelName, d, type) {
    var str = modelName + '.seed ->\n'
    Object.keys(d.toObject()).forEach(function (f) {
      str += '    ' + escape(f) + ': ' + quote(d[f]) + '\n';
    });
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
