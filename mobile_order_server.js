//--------------------------------------------------------//
//      Commands for communicating with the client
//--------------------------------------------------------//

var OrderCommand = {
	REGISTER_STAFF : "registerStaff",
	NEW_ORDER : "newOrder",
	GET_ORDER : "getOrder",
	GET_ORDER_LIST : "getOrderList",
	UPDATE_ORDER_STATUS_READY : "updateOrderStatusReady",
	UPDATE_ORDER_STATUS_COMPLETE : "updateOrderStatusComplete",
	ORDER_UPDATE : "orderUpdate"
}


//---------------------------//
//      Order Model Class
//---------------------------//

function OrderModel() {
	var _this = this;
	this.data = {
		orderlist:{}
	}
	
	this.orderListArray = function() {
		var arr = new Array();
		var map = _this.data.orderlist;
		for(var key in map) {
			var item = map[key];
			arr.push(item);
		}
		return arr;
	}
	
}

//---------------------//
//      Main Part
//---------------------//

// instantiate the web socket order server
var orderServer = require('./orderserver').instantiate();

// instantiate the order model
var orderModel = new OrderModel();

var staffConnection = null;
var orderConnections = {};
var orderTable = {};
var orderId = 0;

orderServer.onCommand('REGISTER_STAFF', function(connection, data) {
	staffConnection = connection;
});

orderServer.onCommand('NEW_ORDER', function(connection, data) {
	console.log('NEW_ORDER');
	
	var orderTable = orderModel.data.orderlist;
	
	data.status = 1;
	data.orderid = "order_" + orderId;
	orderTable[ data.orderid ] = data;
	orderId ++;
	var msg = {command:'ORDER_UPDATE', data:data}
	connection.sendUTF(JSON.stringify(msg));
	
	orderConnections[data.orderid] = connection;
	
	if(staffConnection == null) return;
	
	// notify the staff that there is a new order
	var orderArr = orderModel.orderListArray();
	var msg = {command:'ORDER_UPDATE', data:orderArr}
	staffConnection.sendUTF(JSON.stringify(msg));
	
});

orderServer.onCommand('GET_ORDER', function(connection, data) {
	console.log('GET_ORDER');
	
	var orderTable = orderModel.data.orderlist;
	
	var oid = data.orderid;
	var order = orderTable[oid];
	
	var msg = {command:'ORDER_UPDATE', data:order}
	connection.sendUTF(JSON.stringify(msg));
});
	
orderServer.onCommand('GET_ORDER_LIST', function(connection, data) {
	console.log('GET_ORDER_LIST');
	
	var orderArr = orderModel.orderListArray();
	var msg = {command:'ORDER_UPDATE', data:orderArr}
	connection.sendUTF(JSON.stringify(msg));
});	

orderServer.onCommand('UPDATE_ORDER_STATUS_READY', function(connection, data) {
	console.log('UPDATE_ORDER_STATUS_READY');
	
	var orderTable = orderModel.data.orderlist;
	
	var oid = data.orderid;
	var order = orderTable[oid];
	order.status = 2;
	orderTable[oid] = order;
	var guestCon = orderConnections[oid];
	var msg2guest = {command:'ORDER_UPDATE', data:order}
	guestCon.sendUTF(JSON.stringify(msg2guest));
	
	var orderArr = orderModel.orderListArray();
	
	var msg2staff = {command:'ORDER_UPDATE', data:orderArr}
	connection.sendUTF(JSON.stringify(msg2staff));
});

orderServer.onCommand('UPDATE_ORDER_STATUS_COMPLETE', function(connection, data) {
	console.log('UPDATE_ORDER_STATUS_COMPLETE');
	var oid = data.orderid;
	delete orderModel.data.orderlist[oid];
	
	var emptyOrder = {
		items : [],
		status : 0,
		total : 0,
		orderid: ''
	}
	
	var msg2guest = {command:'ORDER_UPDATE', data:emptyOrder}
	var guestCon = orderConnections[oid];
	guestCon.sendUTF(JSON.stringify(msg2guest));
	
	// TODO:
	// delete the guest connection
	var orderArr = orderModel.orderListArray();
	
	var msg2staff = {command:'ORDER_UPDATE', data:orderArr}
	connection.sendUTF(JSON.stringify(msg2staff));
});

// start the server
orderServer.run( 8080 );
