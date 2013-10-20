function WSOrderServer() {
	
	var _this = this;
	
	this.commandHandler = {};
	
	this.run = function(port, onOpenHandler) {
		
		var WebSocketServer = require('websocket').server;
		var http = require('http');	
		
		var server = http.createServer(function(request, response) {
    		console.log((new Date()) + ' Received request for ' + request.url);
    		response.writeHead(404);
    		response.end();
		});
		
		server.listen(port, function() {
   			console.log((new Date()) + ' Server is listening on port 8080');
		});
		
		var wsServer = new WebSocketServer({
    		httpServer: server,
    		// You should not use autoAcceptConnections for production
    		// applications, as it defeats all standard cross-origin protection
    		// facilities built into the protocol and the browser.  You should
    		// *always* verify the connection's origin and decide whether or not
    		// to accept it.
    		autoAcceptConnections: false
		});
		
		
		wsServer.on('request', function(message) {
			if(! _this.originIsAllowed(request.origin)) {
				request.reject();
				console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
				return;
			}
			
			var connection = request.accept('echo-protocol', request.origin);
			console.log((new Date()) + ' Connection accepted.');
			
			connection.on('message', function(message) {
				if (message.type === 'utf8') {
					var msg = JSON.parse(message.utf8Data);
					var handler = _this.commandHandler[msg.command];
					if(handler != null) {
						handler.apply(handler, [connection, msg.data]);
					}
				}
			});
		});
	}
	
	this.onCommand = function(command, handler) {
		_this.commandHandler[command] = handler;
	}
	
	this.originIsAllowed = function(origin) {
		return true;
	}
}


//------------------//
//		Usage
//------------------//

var s = new WSOrderServer();
s.run(8080);
s.onCommand('REGISTER_STAFF', function(connection, data) {
	
});
s.onCommand('NEW_ORDER', function(connection, data) {
	
});
s.onCommand('GET_ORDER_LIST', function(connection, data) {
	
});
	

