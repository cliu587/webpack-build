webpack-build
=============

[![Build Status](https://travis-ci.org/markfinger/webpack-build.svg?branch=master)](https://travis-ci.org/markfinger/webpack-build)
[![Dependency Status](https://david-dm.org/markfinger/webpack-build.svg)](https://david-dm.org/markfinger/webpack-build)
[![devDependency Status](https://david-dm.org/markfinger/webpack-build/dev-status.svg)](https://david-dm.org/markfinger/webpack-build#info=devDependencies)

Wraps webpack. Does some useful stuff...

- Multiple concurrent compilers across multiple workers
- Persistent caching
- Build server
- HMR support
- Configuration hooks


Documentation
-------------

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Build options](#build-options)
- [Config files](#config-files)
- [Caching](#caching)
- [Workers](#workers)
- [Build server](#build-server)
- [HMR](#hmr)
- [Debugging](#debugging)
- [Dev notes](#dev-notes)
- [Colophon](#colophon)


Installation
------------

```
npm install webpack-build
```


Basic usage
-----------

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js',
  watch: true
}), function(err, data) {
  // ...
});
```

The `data` object includes:

- `stats`: a subset of the compiler's output
- `assets`: a list of absolute paths to the generated assets
- `output`: a map from the entries to the absolute paths of their assets. Assets are grouped by file type
- `urls`: a map from the entries to urls matching their assets. Assets are grouped by file type. These values
  are generated from the `staticRoot` and `staticUrl` options
- `outputOptions`: the compiler's output options
- `fileDependencies`: a list of the files that were used to generate the assets
- `buildOptions`: the options object passed in to the compiler
- `buildHash`: a unique identifier generated by hashing the `buildOptions` object. `build` uses this value
  internally to identify builds as they are passed between compilers, caches, and the hmr handler. The value 
  is unrelated to the hashes generated by webpack


Build options
-------------

The following options can be passed to `build`.

```javascript
{

  // An absolute path to a config file
  config: '/path/to/webpack.config.js',

  // Watching
  // --------

  watch: false,
  aggregateTimeout: 200,
  poll: undefined,

  // Config manipulation
  // -------------------

  outputPath: '', // override for output.path
  publicPath: '', // override for output.publicPath

  // External system integration
  // ---------------------------

  staticRoot: '', // Absolute path to your static root
  staticUrl: '', // Url to your staticRoot

  // Caching
  // -------

  cache: true,
  cacheDir: path.join(process.cwd(), '.webpack_build_cache'),

  // Hot module replacement
  // ----------------------

  hmr: false, // if true, hmr code is injected into the assets
  hmrRoot: '', // The address of the server hosting hmr sockets
  hmrPath: '/__hmr__', // the path to the hmr socket endpoint

}
```


Config files
------------

Config files should export a function that returns a config object.

```javascript
module.exports = function(opts) {
  var config = {
    entry: '...',
    output: {
      // ..
    },
    loaders: [
      // ...
    ]
  };

  if (opts.hmr) {
    config.loaders.push({
      // ...
    });
  }

  return config;
};
```

The function is provided with one argument: the options object that was passed in to the `build` function.
The object will be updated with the default values for all the config flags, so you can compose your config
based on the various build flags.

If you want to pass data down to the function, place it in a `context` property.

```javascript
build({
  config: '/path/to/file.js',
  context: {
    entry: './app.js',
    debug: true
  }
}, function(err, data) {
  // ...
});
```

Your function can then generate a config object reflecting your system

```javascript
module.exports = function(opts) {
  var config = {
    entry: opts.context.entry
    // ...
  };

  if (opts.context.debug) {
    config.devtool = '...';
  }

  return config;
};
```


Caching
-------

Once a compilation request has completed successfully, the output is cached and subsequent 
requests will be served from memory until a compiler invalidates it. To avoid webpack's slow startup,
cached output is also written to disk.

The cache tracks file dependencies, package dependencies, and the emitted assets. Whenever cached 
data is available, the following checks occur before serving it:

- The config file's timestamp is checked against the cached output's start time
- Each file dependency's timestamp is checked against the cached output's start time
- webpack and webpack-build versions are checked against the versions used to populate the cache
- The emitted assets are checked for existence

If any of the checks fail, requests are handed off to a compiler which will repopulate the cache
on completion.

If `watch` is set to true and cached data is available, requests will still cause a compiler to be 
spawned in the background. Spawning the compiler early enables webpack's incremental compilation to
provide rapid rebuilds.


Workers
-------

Worker processes allow the main process to remain responsive during compilation. As many of the more 
popular loaders evaluate synchronously, offloading compilation to workers can be essential for performance. 
Workers enable the main process to focus on assigning work and handling both caching and hmr.

To spawn workers, call `build.workers.spawn()` before sending any build requests.

```javascript
var build = require('webpack-build');

build.workers.spawn();

// ...
```

By default, 2 worker processes will be spawned. You can also pass a number in to specify the number of
workers.

```javascript
var os = require('os');
var build = require('webpack-build');

// Spawn a worker for every CPU core available
build.workers.spawn(os.cpus().length);
```

New requests are assigned to workers in sequential order. Repeated requests will always be sent to the same
worker that previously handled the build, this enables concurrent requests to be batched and served from
in-memory caches.


Build server
------------

A build server is available via a CLI interface: `node_modules/.bin/webpack-build`. Run the binary and connect
via the network to request builds.

During startup the build server will spawn workers processes and configure itself to support HMR.

The following optional arguments are accepted by the CLI interface:

- `-a` or `--address`: the address to listen at, defaults to `127.0.0.1`
- `-p` or `--port`: the port to listen at, defaults to `9009`
- `-w` or `--workers`: the number of workers to use, defaults to `2`

Incoming HTTP requests are routed via:

- `GET: /` responds with a HTML document listing the server's state
- `POST: /build` reads in options as JSON, pipes it to the `build` function, and responds with JSON

Successful builds receive

```javascript
{
  "error": null,
  "data": {
    // ..
  }
}
```

Unsuccessful builds receive

```javascript
{
  "error": {
    // ...
  },
  "data": null
}
```

Depending on how far the request passed through the build process, the response may or may not have a non-null
value for `data`. If an error was produced by the compiler, there may be multiple errors within
`data.stats.errors` and multiple warnings in `data.stats.warnings`.


HMR
---

webpack-build includes hmr functionality comparable to webpack-dev-server. A key difference is that it
namespaces the hmr sockets per build - enabling multiple builds to emit hmr signals concurrently.

```javascript
var build = require('webpack-build');

build({
  config: '/path/to/webpack.config.js',
  watch: true,
  hmr: true
}, function(err, data) {
  // ...
});
```

When assets are rendered on the front-end, they open sockets to the build server and attempt to hot 
update whenever possible. If hot updates are not possible, console logs will indicate that updates
require a refresh to be applied.

If you are using your own server to expose HMR, you'll need to specify the `hmrRoot` option with the 
address of your server, eg: `hmrRoot: 'http://127.0.0.1:9009'`.

To use the hmr socket handler with an express app

```javascript
var http = require('http');
var express = require('express');
var build = require('webpack-build');

var app = express();
var server = http.Server(app);
build.hmr.addToServer(server);
```


Debugging
---------

The environment variable DEBUG is respected by the library's logger. To expose verbose logs to your 
shell, prepend `DEBUG=webpack-build:*` to your shell command. For example: `DEBUG=webpack-build:* npm test`

The project uses babel for ES5 compatibility. If you are using the library's API and you want clearer stack 
traces, turn on source map support:

```
npm install source-map-support --save
```

```javascript
require('source-map-support').install();
```


Dev notes
---------

### Build the project

```
npm run build

# or, to continually rebuild

npm run build -- --watch
```

### Running the tests

```
npm test
```


Colophon
--------

Large portions of this codebase are heavily indebted to [webpack-dev-middleware] and [webpack-dev-server].

This project stands on the shoulders of giants - specifically, Tobias Koppers and the
webpack ecosystem's vast number of contributors.

[webpack-dev-middleware]: https://github.com/webpack/webpack-dev-middleware
[webpack-dev-server]: https://github.com/webpack/webpack-dev-server
