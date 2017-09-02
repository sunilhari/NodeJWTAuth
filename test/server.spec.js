var request = require('supertest')
var server = require('../src/server.js');
const messages = require('../config/messages');
describe('Is Server Running on Port', () => {
    it('Should give status 200', function(done) {
        request(server).get('/')
            .expect(200, done);

    });
});