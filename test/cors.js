// Load modules

var Boom = require('boom');
var Code = require('code');
var Hapi = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('CORS', function () {

    it('returns 404 on OPTIONS when cors disabled', function (done) {

        var handler = function (request, reply) {

            return reply();
        };

        var server = new Hapi.Server();
        server.connection({ routes: { cors: false } });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject({ method: 'OPTIONS', url: '/' }, function (res) {

            expect(res.statusCode).to.equal(404);
            done();
        });
    });

    it('returns OPTIONS response', function (done) {

        var handler = function (request, reply) {

            return reply(Boom.badRequest());
        };

        var server = new Hapi.Server();
        server.connection({ routes: { cors: true } });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject({ method: 'OPTIONS', url: '/' }, function (res) {

            expect(res.headers['access-control-allow-origin']).to.equal('*');
            done();
        });
    });

    it('returns headers on single route', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/a', handler: handler, config: { cors: true } });
        server.route({ method: 'GET', path: '/b', handler: handler });

        expect(server.table()[0].table).to.have.length(3);

        server.inject({ method: 'OPTIONS', url: '/a' }, function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.result).to.be.null();
            expect(res1.headers['access-control-allow-origin']).to.equal('*');

            server.inject({ method: 'OPTIONS', url: '/b' }, function (res2) {

                expect(res2.statusCode).to.equal(404);
                expect(res2.headers['access-control-allow-origin']).to.not.exist();
                done();
            });
        });
    });

    it('allows headers on multiple routes but not all', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/a', handler: handler, config: { cors: true } });
        server.route({ method: 'GET', path: '/b', handler: handler, config: { cors: true } });
        server.route({ method: 'GET', path: '/c', handler: handler });

        expect(server.table()[0].table).to.have.length(5);

        server.inject({ method: 'OPTIONS', url: '/a' }, function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.result).to.be.null();
            expect(res1.headers['access-control-allow-origin']).to.equal('*');

            server.inject({ method: 'OPTIONS', url: '/b' }, function (res2) {

                expect(res2.statusCode).to.equal(200);
                expect(res2.result).to.be.null();
                expect(res2.headers['access-control-allow-origin']).to.equal('*');

                server.inject({ method: 'OPTIONS', url: '/c' }, function (res3) {

                    expect(res3.statusCode).to.equal(404);
                    expect(res3.headers['access-control-allow-origin']).to.not.exist();
                    done();
                });
            });
        });
    });

    it('allows same headers on multiple routes with same path', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/a', handler: handler, config: { cors: true } });
        server.route({ method: 'POST', path: '/a', handler: handler, config: { cors: true } });

        expect(server.table()[0].table).to.have.length(3);

        server.inject({ method: 'OPTIONS', url: '/a' }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.be.null();
            expect(res.headers['access-control-allow-origin']).to.equal('*');
            done();
        });
    });

    it('errors on different headers on multiple routes with same path', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/a', handler: handler, config: { cors: { origin: ['a'] } } });
        expect(function () {

            server.route({ method: 'POST', path: '/a', handler: handler, config: { cors: { origin: ['b'] } } });
        }).to.throw('Cannot add multiple routes with different CORS options on different methods: POST /a');

        done();
    });

    it('reuses connections CORS route when route has same settings', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection({ routes: { cors: true } });
        server.route({ method: 'GET', path: '/a', handler: handler, config: { cors: true } });
        server.route({ method: 'POST', path: '/a', handler: handler, config: { cors: true } });

        expect(server.table()[0].table).to.have.length(2);

        server.inject({ method: 'OPTIONS', url: '/a' }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.be.null();
            expect(res.headers['access-control-allow-origin']).to.equal('*');
            done();
        });
    });

    it('returns headers on single route (overrides defaults)', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection({ routes: { cors: { origin: ['b'] } } });
        server.route({ method: 'GET', path: '/a', handler: handler, config: { cors: { origin: ['a'] } } });
        server.route({ method: 'GET', path: '/b', handler: handler });

        expect(server.table()[0].table).to.have.length(3);

        server.inject({ method: 'OPTIONS', url: '/a' }, function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.result).to.be.null();
            expect(res1.headers['access-control-allow-origin']).to.equal('a');

            server.inject({ method: 'OPTIONS', url: '/b' }, function (res2) {

                expect(res2.statusCode).to.equal(200);
                expect(res2.result).to.be.null();
                expect(res2.headers['access-control-allow-origin']).to.equal('b');
                done();
            });
        });
    });

    it('sets access-control-allow-credentials header', function (done) {

        var handler = function (request, reply) {

            return reply();
        };

        var server = new Hapi.Server();
        server.connection({ routes: { cors: { credentials: true } } });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject('/', function (res) {

            expect(res.result).to.equal(null);
            expect(res.headers['access-control-allow-credentials']).to.equal('true');
            done();
        });
    });

    describe('headers()', function () {

        it('returns CORS origin (route level)', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler, config: { cors: true } });

            server.inject('/', function (res1) {

                expect(res1.result).to.exist();
                expect(res1.result).to.equal('ok');
                expect(res1.headers['access-control-allow-origin']).to.equal('*');

                server.inject({ method: 'OPTIONS', url: '/' }, function (res2) {

                    expect(res2.result).to.be.null();
                    expect(res2.headers['access-control-allow-origin']).to.equal('*');
                    done();
                });
            });
        });

        it('returns CORS origin (GET)', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.equal('http://test.example.com http://www.example.com');
                done();
            });
        });

        it('returns CORS origin (OPTIONS)', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ method: 'options', url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload.length).to.equal(0);
                expect(res.headers['access-control-allow-origin']).to.equal('http://test.example.com http://www.example.com');
                done();
            });
        });

        it('returns CORS without origin', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: [] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.not.exist();
                expect(res.headers['access-control-allow-methods']).to.equal('GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
                done();
            });
        });

        it('override CORS origin', function (done) {

            var handler = function (request, reply) {

                return reply('ok').header('access-control-allow-origin', 'something');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.equal('http://test.example.com http://www.example.com');
                done();
            });
        });

        it('preserves CORS origin header when not locally configured', function (done) {

            var handler = function (request, reply) {

                return reply('ok').header('access-control-allow-origin', 'something');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: [] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.equal('something');
                done();
            });
        });

        it('preserves CORS origin header when override disabled', function (done) {

            var handler = function (request, reply) {

                return reply('ok').header('access-control-allow-origin', 'something');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { override: false } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.equal('something');
                done();
            });
        });

        it('merges CORS origin header when override is merge', function (done) {

            var handler = function (request, reply) {

                return reply('ok').header('access-control-allow-methods', 'something');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { additionalMethods: ['xyz'], override: 'merge' } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-methods']).to.equal('something,GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS,xyz');
                done();
            });
        });

        it('returns no CORS headers when route CORS disabled', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler, config: { cors: false } });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.not.exist();
                done();
            });
        });

        it('does not return CORS for no origin without isOriginExposed', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { isOriginExposed: false, origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/' }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.not.exist();
                expect(res.headers.vary).to.equal('origin');
                done();
            });
        });

        it('hides CORS origin if no match found', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { isOriginExposed: false, origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://x.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-origin']).to.not.exist();
                expect(res.headers.vary).to.equal('origin');
                done();
            });
        });

        it('returns matching CORS origin', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com', 'http://*.a.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('http://www.example.com');
                expect(res.headers.vary).to.equal('x-test,origin');
                done();
            });
        });

        it('returns origin header when matching against *', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['*'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('http://www.example.com');
                expect(res.headers.vary).to.equal('x-test,origin');
                done();
            });
        });

        it('returns * when matching is disabled', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['*'], matchOrigin: false } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('*');
                expect(res.headers.vary).to.equal('x-test');
                done();
            });
        });

        it('returns matching CORS origin without exposing full list', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test', true);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { isOriginExposed: false, origin: ['http://test.example.com', 'http://www.example.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.example.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('http://www.example.com');
                expect(res.headers.vary).to.equal('x-test,origin');
                done();
            });
        });

        it('returns matching CORS origin wildcard', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com', 'http://*.a.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.a.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('http://www.a.com');
                expect(res.headers.vary).to.equal('x-test,origin');
                done();
            });
        });

        it('returns matching CORS origin wildcard when more than one wildcard', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test', true);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com', 'http://*.b.com', 'http://*.a.com'] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.a.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('http://www.a.com');
                expect(res.headers.vary).to.equal('x-test,origin');
                done();
            });
        });

        it('returns all CORS origins when match is disabled', function (done) {

            var handler = function (request, reply) {

                return reply('Tada').header('vary', 'x-test');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['http://test.example.com', 'http://www.example.com'], matchOrigin: false } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { origin: 'http://www.a.com' } }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('Tada');
                expect(res.headers['access-control-allow-origin']).to.equal('http://test.example.com http://www.example.com');
                expect(res.headers.vary).to.equal('x-test');
                done();
            });
        });

        it('does not set empty CORS expose headers', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { exposedHeaders: [] } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/' }, function (res) {

                expect(res.result).to.exist();
                expect(res.result).to.equal('ok');
                expect(res.headers['access-control-allow-methods']).to.exist();
                expect(res.headers['access-control-expose-headers']).to.not.exist();
                done();
            });
        });
    });
});
