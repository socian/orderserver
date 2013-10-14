/**
 * @author Daniel Dihardja
 */
var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

var orderTable = {}
var count = 0;

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
        	var msg = JSON.parse(message.utf8Data);
        	
        	// add new order to the order queue
        	if(msg.command == 'NEW_ORDER') {
        		
     			// replace this with a method that
        		// returns a unique order ID
        		var orderId = count ++;
        		var orderStatus = '1';
        		
        		orderTable[ orderId ] = msg.data; 
        		orderTable[ orderId ].status = orderStatus;
        		
        		// send the order ID to the client
        		var resObj = {command:"ORDER_RECEIVED", data:{"orderId":orderId, "orderStatus":orderStatus}}
        		connection.sendUTF(JSON.stringify(resObj));
        	}
        	
        	// get an existing order by the order id
        	if(msg.command == 'GET_ORDER') {
        		var orderId = msg.data;
        		var order = orderTable[ orderId ];
        		if(typeof order === 'undefined' || order == null) {
        			order = {items:[], status:'0'}
        		}
        		var res = {command:'EXISTING_ORDER', data:order}
        		connection.sendUTF(JSON.stringify(res));
        	} 
        	
        	if(msg.command == 'GET_ORDERS') {
        		var res = {command:'ORDERS', data:orderTable}
        		connection.sendUTF(JSON.stringify(res));
        		console.log(orderTable);
        	}    
        }
    });
    
    
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});