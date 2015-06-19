import cluster from 'cluster';
import _ from 'lodash';
import options from '../options';
import Worker from './Worker';

class Workers {
  constructor() {
    this.workers = [];
    this.next = 0;
    this.matches = Object.create(null);
  }
  available() {
    return this.workers.length > 0;
  }
  count() {
    return this.workers.length;
  }
  spawn(number) {
    // Spawns worker processes. If `number` is not defined, 2 workers are spawned

    number = number || 2;

    _.range(number).forEach(() => {
      this.workers.push(new Worker());
    });
  }
  build(opts, cb) {
    // Passes `opts` to an available worker

    opts = options(opts);

    if (!this.available()) {
      return cb(new Error('No workers available'));
    }

    let matchedWorker = this.match(opts);
    if (matchedWorker) {
      return matchedWorker.build(opts, cb);
    }

    let [err, worker] = this.get(opts);

    if (err) return cb(err, null);

    this.matches[opts.buildHash] = worker.id;
    worker.build(opts, cb);
  }
  match(opts) {
    // Returns a worker, if any, which has previously built `opts` and is likely
    // to have a warm compiler or an in-memory cache

    let key = opts.buildHash;
    let id = this.matches[key];
    if (id) {
      return _.find(this.workers, {id});
    }
  }
  get(opts) {
    // Returns the next available worker who can handle the build

    let current = this.next;

    do {
      let worker = this.workers[this.next];

      this.next++;
      if (this.next >= this.workers.length) {
        this.next = 0;
      }

      if (worker.canHandle(opts)) {
        return [null, worker];
      }
    } while(this.next != current);

    return [
      new Error(`No workers are available who can safely handle ${opts.config}. Restart the process or add more workers`),
      null
    ];
  }
  killAll() {
    for (let worker of this.workers) {
      worker.kill();
    }
    this.workers = [];
    this.next = 0;
    this.matches = Object.create(null);
  }
}

export default new Workers();