'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _libWorkersWorker = require('../../lib/workers/Worker');

var _libWorkersWorker2 = _interopRequireDefault(_libWorkersWorker);

var _libWorkers = require('../../lib/workers');

var _libWorkers2 = _interopRequireDefault(_libWorkers);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var assert = _utils2['default'].assert;

// Ensure we have a clean slate before and after each test
beforeEach(function () {
  _libWorkers2['default'].killAll();
  _utils2['default'].cleanTestOutputDir();
});
afterEach(function () {
  _libWorkers2['default'].killAll();
  _utils2['default'].cleanTestOutputDir();
});

describe('workers', function () {
  it('should be able to spawn workers and indicate if any are available', function () {
    assert.isFalse(_libWorkers2['default'].available());
    assert.equal(_libWorkers2['default'].count(), 0);

    _libWorkers2['default'].spawn(1);

    assert.isTrue(_libWorkers2['default'].available());
    assert.equal(_libWorkers2['default'].count(), 1);
    assert.instanceOf(_libWorkers2['default'].workers[0], _libWorkersWorker2['default']);

    _libWorkers2['default'].spawn(2);

    assert.isTrue(_libWorkers2['default'].available());
    assert.equal(_libWorkers2['default'].count(), 3);
    assert.instanceOf(_libWorkers2['default'].workers[0], _libWorkersWorker2['default']);
    assert.instanceOf(_libWorkers2['default'].workers[1], _libWorkersWorker2['default']);
    assert.instanceOf(_libWorkers2['default'].workers[2], _libWorkersWorker2['default']);

    _libWorkers2['default'].killAll();

    assert.isFalse(_libWorkers2['default'].available());
    assert.equal(_libWorkers2['default'].count(), 0);
    assert.isUndefined(_libWorkers2['default'].workers[0]);
    assert.isUndefined(_libWorkers2['default'].workers[1]);
    assert.isUndefined(_libWorkers2['default'].workers[2]);
  });
  describe('#build', function () {
    it('should request a build from a worker', function (done) {
      _libWorkers2['default'].spawn(1);

      var opts = {
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      _libWorkers2['default'].build(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        done();
      });
    });
    it('should produce errors if requests for a dead worker arrive', function (done) {
      _libWorkers2['default'].spawn(1);

      var opts = {
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      _libWorkers2['default'].build(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        _libWorkers2['default'].workers[0].kill();

        _libWorkers2['default'].build(opts, function (err, data) {
          assert.instanceOf(err, Error);
          assert.isNull(data);

          done();
        });
      });
    });
    it('should produce errors if no worker can safely handle a build request', function (done) {
      _libWorkers2['default'].spawn(1);

      var opts = {
        config: _path2['default'].join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
      };

      _libWorkers2['default'].build(opts, function (err, data) {
        assert.isNull(err);
        assert.isObject(data);

        assert.isTrue(_libWorkers2['default'].workers[0].canHandle(opts));
        opts.buildHash = 'test';
        assert.isFalse(_libWorkers2['default'].workers[0].canHandle(opts));

        _libWorkers2['default'].build(opts, function (err, data) {
          assert.instanceOf(err, Error);
          assert.isNull(data);

          _libWorkers2['default'].spawn(1);
          assert.isTrue(_libWorkers2['default'].workers[1].canHandle(opts));

          _libWorkers2['default'].build(opts, function (err, data) {
            assert.isNull(err);
            assert.isObject(data);

            done();
          });
        });
      });
    });
  });
  //describe('#build', () => {
  //  it('should accept an options argument and provide the output from the build', (done) => {
  //    let worker = new Worker();
  //
  //    worker.build({
  //      config: path.join(__dirname, 'test_bundles', 'basic_bundle', 'webpack.config.js')
  //    }, (err, data) => {
  //      assert.isNull(err);
  //      assert.isObject(data);
  //
  //      let existsAt = data.assets[0];
  //      assert.isString(existsAt);
  //
  //      let contents = fs.readFileSync(existsAt).toString();
  //      assert.include(contents, '__BASIC_BUNDLE_ENTRY_TEST__');
  //      assert.include(contents, '__BASIC_BUNDLE_REQUIRE_TEST__');
  //
  //      worker.kill();
  //      done();
  //    });
  //  });
  //  it('should handle errors', (done) => {
  //    let worker = new Worker();
  //
  //    worker.build({
  //      config: path.join('/does/not/exist')
  //    }, (err, data) => {
  //      assert.isObject(err);
  //      assert.isString(err.type);
  //      assert.isString(err.message);
  //      assert.isString(err.stack);
  //      assert.isNull(data);
  //
  //      worker.kill();
  //      done();
  //    });
  //  });
  //});
});
//# sourceMappingURL=workers.js.map