function WSOrderServer() {
	
	var _this = this;
	
	this.commandHandler = {};
	
	this.run = function(port) {
		
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
		
		
		wsServer.on('request', function(request) {
			if(! _this.originIsAllowed(request.origin)) {
				request.reject();
				console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
				return;
			}
			
			var connection = request.accept('', request.origin);
			console.log((new Date()) + ' Connection accepted.');
			
			connection.on('message', function(message) {
				if (message.type === 'utf8') {
					console.log(message.utf8Data);
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


function OrderModel() {
	var _this = this;
	this.data = {
		orderlist:{}
	}
	
	this.orderListArray = function() {
		var arr = new Array();
		for(var key in _this.data.orderlist) {
			var item = _this.data.orderlist[key];
			arr.push(item);
		}
		return arr;
	}
}

//------------------//
//		Usage
//------------------//

var s = new WSOrderServer();

var staffConnection = null;
var orderConnections = {};
var orderTable = {};
var orderId = 0;

s.onCommand('REGISTER_STAFF', function(connection, data) {
	staffConnection = connection;
});

s.onCommand('NEW_ORDER', function(connection, data) {
	console.log('NEW_ORDER');
	data.status = 1;
	data.orderid = "order_" + orderId;
	orderTable[ data.orderid ] = data;
	orderId ++;
	var msg = {command:'ORDER_UPDATE', data:data}
	connection.sendUTF(JSON.stringify(msg));
	
	orderConnections[data.orderid] = connection;
	
	if(staffConnection == null) return;
	
	// notify the staff that there is a new order
	
	// TODO:
	// outsource into a model
	var orderArr = new Array();
	for(var key in orderTable) {
		var item = orderTable[key];
		orderArr.push(item);
	}
	var msg = {command:'ORDER_UPDATE', data:orderArr}
	staffConnection.sendUTF(JSON.stringify(msg));
	
});

s.onCommand('GET_ORDER', function(connection, data) {
	console.log('GET_ORDER');
	
	var oid = data.orderid;
	var order = orderTable[oid];
	
	var msg = {command:'ORDER_UPDATE', data:order}
	connection.sendUTF(JSON.stringify(msg));
});
	
s.onCommand('GET_ORDER_LIST', function(connection, data) {
	console.log('GET_ORDER_LIST');
	var orderArr = new Array();
	
	// TODO:
	// outsource into a model
	for(var key in orderTable) {
		var item = orderTable[key];
		orderArr.push(item);
	}
	var msg = {command:'ORDER_UPDATE', data:orderArr}
	connection.sendUTF(JSON.stringify(msg));
});	

s.onCommand('UPDATE_ORDER_STATUS_READY', function(connection, data) {
	console.log('UPDATE_ORDER_STATUS_READY');
	var oid = data.orderid;
	var order = orderTable[oid];
	order.status = 2;
	orderTable[oid] = order;
	var guestCon = orderConnections[oid];
	var msg2guest = {command:'ORDER_UPDATE', data:order}
	guestCon.sendUTF(JSON.stringify(msg2guest));
	
	// TODO:
	// outsource into a model
	var orderArr = new Array();
	for(var key in orderTable) {
		var item = orderTable[key];
		orderArr.push(item);
	}
	
	var msg2staff = {command:'ORDER_UPDATE', data:orderArr}
	connection.sendUTF(JSON.stringify(msg2staff));
});

s.onCommand('UPDATE_ORDER_STATUS_COMPLETE', function(connection, data) {
	console.log('UPDATE_ORDER_STATUS_COMPLETE');
	var oid = data.orderid;
	delete orderTable[oid];
	
	var emptyOrder = {
		items : [],
		status : 0,
		total : 0,
		orderid: ''
	}
	
	var msg2guest = {command:'ORDER_UPDATE', data:emptyOrder}
	var guestCon = orderConnections[oid];
	guestCon.sendUTF(JSON.stringify(msg2guest));
	
	// does this also delete orderConnections[oid] ? 
	//delete guestCon;
	
	// TODO:
	// outsource into a model
	var orderArr = new Array();
	for(var key in orderTable) {
		var item = orderTable[key];
		orderArr.push(item);
	}
	
	var msg2staff = {command:'ORDER_UPDATE', data:orderArr}
	connection.sendUTF(JSON.stringify(msg2staff));
});

// start the server
s.run( 8080 );
