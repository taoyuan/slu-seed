# slu-seed [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> Database seed module for [loopback](https://github.com/strongloop/loopback) applications.

## Installation

```sh
npm install slu-seed --save
```
 
## Usage

#### 1. added to `component-config.json`

```js
...
"slu-seed": {}
...

```
 
#### 2. put sample data to `./server/db/seeds/{env}/{any_name}.js`.

For example:

```js
// ./server/db/seeds/development/users.js
User.seed({
    "username": "bob",
    "password": "secret",
    "email": "foo@bar.com"
});
```

#### 3. seed data

* seed data using `slu` command line.

```sh

slu seed

```

* or seed data in program.

```js
...
app.seed();
...
```

#### 4. create seeds using data stored in database

```sh

slu seed harvest

```

## License

MIT © [Tao Yuan]()

[npm-image]: https://badge.fury.io/js/slu-seed.svg
[npm-url]: https://npmjs.org/package/slu-seed
[travis-image]: https://travis-ci.org/taoyuan/slu-seed.svg?branch=master
[travis-url]: https://travis-ci.org/taoyuan/slu-seed
[daviddm-image]: https://david-dm.org/taoyuan/slu-seed.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/taoyuan/slu-seed
[coveralls-image]: https://coveralls.io/repos/taoyuan/slu-seed/badge.svg
[coveralls-url]: https://coveralls.io/r/taoyuan/slu-seed
