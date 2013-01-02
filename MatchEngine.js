var createEngine = function createEngine() {
	var util = require('util'),
		EventEmitter = require('events').EventEmitter;

	var Engine = function(){};
	util.inherits(Engine, EventEmitter);

	var getNewId = function getNewId() {
		var orderId = 0;
		return function() { 
			orderId = orderId + 1;
			return orderId;
		}
	}();

	Engine.prototype.bids = [];
	Engine.prototype.offers = [];
	Engine.prototype.orders = {};

	Engine.prototype.submitOrder = function(order) {
		if (order.quantity === 0 ) {
			throw new Error("Order must have non-zero quantity");
		}

		var internalOrder = {
			id: 		getNewId(),
			price: 		order.price,
			quantity: 	Math.abs(order.quantity),
			status:  	"Working"
		};

		this.orders[internalOrder.id] = internalOrder;

		var isBuy = order.quantity > 0;
		var book = isBuy ? this.bids : this.offers;
		var otherBook = isBuy ? this.offers : this.bids;
		var comparison = isBuy ? 
			function(price) { return internalOrder.price >= price; } 
			: 
			function(price) { return internalOrder.price <= price; }

		var level = otherBook[0];
		while (level && internalOrder.quantity > 0 && comparison(level[0].price))
		{
			var i = 0;
			for (;i < level.length; i++)
			{
				var order = level[i];
				var quantity = Math.min(internalOrder.quantity, order.quantity);
				var adjustQuantity = function(order, quantity) {
					order.quantity = order.quantity - quantity;
					if (order.quantity === 0)
					{
						order.status = "Complete";
					}
				};
				adjustQuantity(internalOrder, quantity);
				adjustQuantity(order, quantity);
				this.emit("match", order, internalOrder, order.price, quantity);
				if (internalOrder.quantity == 0)
					break;
			}
			level.splice(0, i);
			if (level.length === 0)
			{
				otherBook.splice(0, 1);
			}
			level = otherBook[0];
		}

		var insertComparison = isBuy ? 
			function(price) { return internalOrder.price > price; } 
			: 
			function(price) { return internalOrder.price < price; }

		var levelIndex = 0;
		var level = book[0];
		while (level && insertComparison(level[0].price))
		{
			levelIndex = levelIndex + 1;
			level = book[levelIndex];
		}

		if (!level)
		{
			book[levelIndex] = level = [];
		}
		level.push(internalOrder);


		return internalOrder.id;
	};

	Engine.prototype.getStatus = function(orderId) {
		var order = this.orders[orderId];
		return order ? order.status : undefined;
	};

	Engine.prototype.cancelOrder = function(orderId) {
		var order = this.orders[orderId];
		if (!order)
		{
			return false;
		}

		if (order.status !== "Working")
		{
			return false;
		}
		// TODO: Remove order from book
		order.status = "Cancelled";

		return true;
	};
	return new Engine();
};

exports.createEngine = createEngine;