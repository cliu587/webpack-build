webpack-build
=============

[![Build Status](https://travis-ci.org/markfinger/webpack-build.svg?branch=master)](https://travis-ci.org/markfinger/webpack-build)
[![Dependency Status](https://david-dm.org/markfinger/webpack-build.svg)](https://david-dm.org/markfinger/webpack-build)
[![devDependency Status](https://david-dm.org/markfinger/webpack-build/dev-status.svg)](https://david-dm.org/markfinger/webpack-build#info=devDependencies)

A build library which wraps webpack and provides a variety of optimizations and utilities.


Features include
----------------

- Multiple concurrent compilers
- Persistent caching to reduce initial and repeated build times
- HMR support
- Support for environment configuration hooks in your config files
- Output that can be easily passed between processes


Documentation
-------------

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Configuration](#configuration)
- [Caching](#caching)
- [Environment configuration](#environment-configuration)
- [HMR](#hmr)
- [Running the tests](#running-the-tests)
- [Colophon](#colophon)


Installation
------------

```bash
npm install webpack-build
```


Basic usage
-----------

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js'
}), function(err, stats) {
  // ...
});
```


Configuration
-------------

```javascript
{

  // An absolute path to a config file
  config: '/path/to/webpack.config.js',
  
  // Watching
  // --------

  watch: true,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  // -------------------

  env: '', // the env to apply
  outputPath: '', // override for output.path
  publicPath: '', // override for output.publicPath

  // External system integration
  // ---------------------------

  staticRoot: '', // Absolute path to your root static dir
  staticUrl: '', // Url to your root static dir

  // Caching
  // -------

  cache: true,
  cacheDir: path.join(process.cwd(), '.webpack_cache'),

  // Hot module replacement
  // ----------------------

  hmr: false, // if true, hmr code is injected
  hmrRoot: '', // The address of the build server
  hmrPath: '/__webpack_hmr__', // the mount point of the socket handler

}
```


Compilation output
------------------

The wrapper provides the output of webpack's `stats.toJson` method, with
some non-standard props:

- `webpackConfig`: the config object generated and passed to webpack
- `pathsToAssets`: an object mapping asset names to the full path of the generated asset
- `urlsToAssets`: an object mapping asset names to the full url of the generated asset. The values
  are generated by subtracting `staticRoot` from the values in `pathsToAssets` and prepending `staticUrl`
- `rendered`: an object providing arrays of `<script>` and `<link>` elements pointing to the values
  from `urlsToAssets`

Caching
-------

A persistent file cache is used to improve build times.

To avoid serving stale data, the wrapper tracks file and package dependencies. Before serving up any
cached data, file timestamps and package versions are checked.


Environment configuration
-------------------------

You can specify functions in your config file which can be run to generate environment-specific configuration.

```javascript
module.exports = {
  // ...
  env: {
    dev: function(config, opts) {
      config.devtool = 'eval';

      config.loaders.push({
        // ...
      });
    },
    prod: function(config, opts) {
      config.devtool = 'source-map';
    }
  }
};
```

To apply any environment configuration, pass in the `env` option to the wrapper

```javascript
var build = require('webpack-build');

build({
  // ...
  env: 'dev'
}, function(err, stats) {
  // ...
});
```

`env` functions are provided with both the config object and the options object passed in to `build`.

The wrapper also comes with some convenience functions that apply changes to handle common
situations and help you avoid boilerplate.

```javascript
var build = require('webpack-build');

module.exports = {
  // ...
  env: {
    dev: build.env.dev,
    prod: build.env.prod
  }
};
```

`build.env.dev(config, opts)`

- Sets `devtool` to `eval-source-maps`
- Sets `output.pathinfo` to `true`
- Adds `new webpack.optimize.OccurrenceOrderPlugin()`
- Adds `new webpack.NoErrorsPlugin()`
- Adds
  ```
  new webpack.DefinePlugin({
    'process.env': {NODE_ENV: JSON.stringify('development')}
  })
  ```


`build.env.prod(config, opts)`

- Sets `devtool` to `source-map`
- Adds `new webpack.optimize.OccurrenceOrderPlugin()`
- Adds `new webpack.NoErrorsPlugin()`
- Adds `new webpack.optimize.DedupePlugin()`
- Adds `new webpack.optimize.UglifyJsPlugin()`
- Adds
  ```
  new webpack.DefinePlugin({
    'process.env': {NODE_ENV: JSON.stringify('production')}
  })
  ```


HMR
---

webpack-build includes hooks to add HMR functionality

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js',
  hmr: true,
  hmrRoot: 'http://127.0.0.1:8000',
  outputPath: '/path/to/output/dir',
  publicPath: '/static/output/dir',
}, function(err, stats) {
  // ...
});
```

When assets are rendered on the front-end, they open sockets to the build server and
attempt to hot update whenever possible. If hot updates are not possible, console logs
will indicate the need to refresh for updates to be applied.


Running the tests
-----------------

```bash
npm run build
npm test
```


Colophon
--------

Large portions of this codebase are heavily indebted to
[webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) and
[webpack-dev-server](https://github.com/webpack/webpack-dev-server).

This project stands on the shoulders of giants - specifically, Tobias Koppers and the webpack 
ecosystem's vast number of contributors.
