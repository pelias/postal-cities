
const Agent = require('agentkeepalive');

module.exports = function agentFactory(){
    return new Agent({
        maxSockets: 100,
        maxFreeSockets: 10,
        timeout: 60000,
        keepAliveTimeout: 30000 // free socket keepalive for 30 seconds
    });
}