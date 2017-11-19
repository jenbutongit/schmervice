'use strict';

const Code = require('code');
const Hapi = require('hapi');
const Schmervice = require('..');
const Lab = require('lab');

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;

describe('Schmervice', () => {

    describe('Service class', () => {

        it('sets server and options on the instance.', () => {

            const service = new Schmervice.Service('server', 'options');

            expect(service.server).to.equal('server');
            expect(service.options).to.equal('options');
        });

        it('runs initialize() onPreStart and teardown() onPostStop.', async () => {

            const ServiceX = class ServiceX extends Schmervice.Service {

                constructor(server, options) {

                    super(server, options);

                    this.initialized = false;
                    this.toredown = false;
                }

                async initialize() {

                    this.initialized = true;

                    await Promise.resolve();
                }

                async teardown() {

                    this.toredown = true;

                    await Promise.resolve();
                }
            };

            const server = Hapi.server();
            const serviceX = new ServiceX(server, {});

            expect(serviceX.initialized).to.equal(false);
            expect(serviceX.toredown).to.equal(false);

            await server.initialize();

            expect(serviceX.initialized).to.equal(true);
            expect(serviceX.toredown).to.equal(false);

            server.ext('onPreStop', () => {

                expect(serviceX.initialized).to.equal(true);
                expect(serviceX.toredown).to.equal(false);
            });

            await server.stop();

            expect(serviceX.initialized).to.equal(true);
            expect(serviceX.toredown).to.equal(true);
        });

        it('configures caching via static caching prop.', async () => {

            const ServiceX = class ServiceX extends Schmervice.Service {
                add(a, b) {

                    this.called = (this.called || 0) + 1;

                    return a + b;
                }
            };

            ServiceX.caching = {
                add: {
                    expiresIn: 2000,
                    generateTimeout: false
                }
            };

            const server = Hapi.server();
            const serviceX = new ServiceX(server, {});

            // Replaced with server method
            expect(serviceX.add).to.not.shallow.equal(ServiceX.prototype.add);

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(1);

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(2);

            // Let the caching begin
            await server.initialize();

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(3);

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(3);

            expect(await serviceX.add(2, 3)).to.equal(5);
            expect(serviceX.called).to.equal(4);

            expect(await serviceX.add(2, 3)).to.equal(5);
            expect(serviceX.called).to.equal(4);
        });

        it('configures caching via caching().', async () => {

            const ServiceX = class ServiceX extends Schmervice.Service {

                constructor(server, options) {

                    super(server, options);

                    this.caching({
                        add: {
                            expiresIn: 2000,
                            generateTimeout: false
                        }
                    });
                }

                add(a, b) {

                    this.called = (this.called || 0) + 1;

                    return a + b;
                }
            };

            const server = Hapi.server();
            const serviceX = new ServiceX(server, {});

            // Replaced with server method
            expect(serviceX.add).to.not.shallow.equal(ServiceX.prototype.add);

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(1);

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(2);

            // Let the caching begin
            await server.initialize();

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(3);

            expect(await serviceX.add(1, 2)).to.equal(3);
            expect(serviceX.called).to.equal(3);

            expect(await serviceX.add(2, 3)).to.equal(5);
            expect(serviceX.called).to.equal(4);

            expect(await serviceX.add(2, 3)).to.equal(5);
            expect(serviceX.called).to.equal(4);
        });

        it('only allows caching to be configured once.', () => {

            const ServiceX = class ServiceX extends Schmervice.Service {

                constructor(server, options) {

                    super(server, options);

                    this.caching({
                        add: {
                            expiresIn: 2000,
                            generateTimeout: false
                        }
                    });
                }

                add(a, b) {

                    this.called = (this.called || 0) + 1;

                    return a + b;
                }
            };

            ServiceX.caching = {
                add: {
                    expiresIn: 2000,
                    generateTimeout: false
                }
            };

            const server = Hapi.server();

            expect(() => new ServiceX(server, {})).to.throw('Caching config can only be specified once.');
        });
    });

    describe('plugin', () => null);
});
