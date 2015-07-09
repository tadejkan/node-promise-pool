

var should = require('should');

try {
    var PromisePool = require('../../lib-cov/PromisePool');
}
catch (err) {
    var PromisePool = require('../../lib/PromisePool');
}

describe('PromisePool', function(){
    var pool = null;
    var smallPool = null;

    beforeEach(function(){
        pool = new PromisePool({
            name: 'test-pool',
            max: 100,
            min: 10,
            create: function(){ return {}; },
            destroy: function(obj){}
        });

        smallPool = new PromisePool({
            name: 'small-pool',
            max: 1,
            min: 0,
            create: function(){ return {}; },
            destroy: function(obj){}
        });
    });

    afterEach(function(){
        return Promise.all([
            pool.drain(),
            smallPool.drain()
        ]);
    });

    describe('constructor', function(){
        it('should create a pool', function(){
            pool.should.be.an.instanceOf(PromisePool);
        });

        it('should accept a logging function', function(){
            var logCount = 0;
            var pool2 = new PromisePool({
                log: function(msg, level){ ++logCount; },
                create: function(){ return {}; },
                destroy: function(obj){}
            });

            return pool2.acquire(function(conn){
                return Promise.resolve();
            }).then(function(){
                logCount.should.be.greaterThan(0);
            });
        });
    });

    describe('#acquire', function(){
        it('should get a connection', function(){
            return pool.acquire(function(conn){
                should.exist(conn);

                return Promise.resolve();
            });
        });

        it('should not hand out acquired connections', function(){
            return pool.acquire(function(conn){
                return pool.acquire(function(conn2){
                    conn.should.not.equal(conn2);
                    return Promise.resolve();
                });
            });
        });

        it('should queue requests when out of connections', function(){
            var pool2 = new PromisePool({
                max: 1,
                create: function(){ return {}; },
                destroy: function(){}
            });

            var conn = null;
            var conn2 = null;
            var prom = null;
            return pool2.acquire(function(_conn){
                conn = _conn;

                prom = pool2.acquire(function(_conn2){
                    conn2 = _conn2;
                    conn.should.equal(conn2);
                    return Promise.resolve();
                });

                return new Promise(function(res){
                    setTimeout(res, 10);
                }).then(function(){
                    should.not.exist(conn2);
                });
            }).then(function(){ return prom; }).then(function(){
                should.exist(conn2);
                conn.should.equal(conn2);
            });
        });

        it('should refuse to acquire while draining', function(){
            var drain = pool.drain();

            should.throws(function(){
                pool.acquire(function(conn){
                    should.not.exist(conn);
                    return Promise.resolve();
                }).catch(function(err){
                    throw err;
                });
            });

            return drain;
        });

        it('should propagate the results of the callback', function(){
            return pool.acquire(function(conn){
                return Promise.resolve('foobar');
            }).then(function(res){
                res.should.eql('foobar');
            });
        });

        it('should propagate errors of the callback', function(){
            return pool.acquire(function(conn){
                return Promise.reject('bizbang');
            }).catch(function(err){
                err.should.eql('bizbang');
            });
        });

        it('should handle errors thrown in callback', function(){
            return pool.acquire(function(conn){
                throw 'Oh NO!';
            }).catch(function(err){
                err.should.eql('Oh NO!');
            });
        });
    });

    describe('#release', function(){
        it('should gracefully refuse to double double release', function(){
            return pool.acquire(function(conn){
                pool.release(conn);
                return Promise.resolve();
            });
        });

        it('should return resources to the front when returnToHead is true', function(){
            var counter = 0;
            var headPool = new PromisePool({
                max: 5,
                min: 3,
                returnToHead: true,
                create: function(){ return {id: ++counter}; },
                destroy: function(conn){}
            });

            var conn = null;
            return headPool.acquire(function(_conn){
                conn = _conn;
                return Promise.resolve();
            }).then(function(){
                return headPool.acquire(function(conn2){
                    conn.should.equal(conn2);
                    conn.id.should.eql(conn2.id);
                    return Promise.resolve();
                });
            });
        });

        it('should not return destroyed objects to the pool', function(){
            var conn = null;
            return smallPool.acquire(function(_conn){
                conn = _conn;
                return smallPool.destroy(conn);
            }).then(function(){
                return smallPool.acquire(function(conn2){
                    conn.should.not.equal(conn2);
                    return Promise.resolve();
                });
            });
        });
    });
});
