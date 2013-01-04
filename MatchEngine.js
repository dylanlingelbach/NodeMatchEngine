var createEngine = function createEngine() {
	var util = require('util'),
		EventEmitter = require('events').EventEmitter;

	var getNewId = function getNewId() {
		var orderId = 0;
		return function() { 
			orderId = orderId + 1;
			return orderId;
		}
	}();

	var adjustQuantity = function(order, newQuantity) {
		order.quantity = Math.max(0, newQuantity);
		if (order.quantity === 0) {
			order.status = "Complete";
		}
	};

	var Book = function () {
		this.levels = [];
	};

	Book.prototype.map = function(fun) {
		return this.levels.map(fun);
	};

	Book.prototype.addOrder = function(order) {
		if (order.quantity <= 0)
			return;
		var levelIndex = 0;
		var level = this.levels[0];

		var comp = order.isBuy ? 
			function(price) { return order.price < price; } 
			: 
			function(price) { return order.price > price; }

		while (level && comp(level.price))
		{
			levelIndex = levelIndex + 1;
			level = this.levels[levelIndex];
		}

		if (!level || level.price !== order.price)
		{
			level = [];
			level.price = order.price;
			this.levels.splice(levelIndex, 0, level);
		}
		level.push(order);
	};

	Book.prototype.removeOrder = function(order) {
		for (var l = 0; l < this.levels.length; l++)
		{
			var level = this.levels[l];
			if (level.price === order.price)
			{
				for (var i = 0; i < level.length; i++)
				{
					if (level[i].id === order.id)
					{
						level.splice(i, 1);
						if (level.length === 0)
						{
							this.levels.splice(i, 1);
						}
						return true;
					}
				}
			}
		}

		return false;
	};

	Book.prototype.findMatches = function(order) {
		var comp = order.isBuy ? 
			function(price) { return order.price >= price; } 
			: 
			function(price) { return order.price <= price; }

		var level = this.levels[0];
		var remainingQuantity = order.quantity;
		var matches = [];
		for (var i = 0; i < this.levels.length; i++)
		{
			var level = this.levels[i];
			if (!comp(level.price))
			{
				break;
			}

			for (var j = 0; j < level.length && remainingQuantity > 0; j++)
			{
				var restingOrder = level[j];
				matches.push(restingOrder);
				remainingQuantity = remainingQuantity - restingOrder.quantity;
			}
		}

		return matches;
	};

	var Engine = function(){
		this.bids = new Book();
		this.offers = new Book();
		this.orders = {};
	};
	util.inherits(Engine, EventEmitter);

	Engine.prototype.submitOrder = function(order) {
		if (order.quantity === 0 ) {
			throw new Error("Order must have non-zero quantity");
		}

		var isBuy = order.quantity > 0;
		var book = isBuy ? this.bids : this.offers;
		var otherBook = isBuy ? this.offers : this.bids;

		var aggressiveOrder = {
			id: 		getNewId(),
			price: 		order.price,
			quantity: 	Math.abs(order.quantity),
			status:  	"Working",
			isBuy: 		isBuy
		};

		var matches = otherBook.findMatches(aggressiveOrder);

		this.orders[aggressiveOrder.id] = aggressiveOrder;

		for (var i = 0; i < matches.length; i++)
		{
			var restingOrder = matches[i];
			var matchQuantity = Math.min(aggressiveOrder.quantity, restingOrder.quantity);
			adjustQuantity(restingOrder, restingOrder.quantity - matchQuantity);
			adjustQuantity(aggressiveOrder, aggressiveOrder.quantity - matchQuantity);

			this.emit('match', restingOrder, aggressiveOrder, restingOrder.price, matchQuantity);

			if (restingOrder.quantity === 0)
			{
				otherBook.removeOrder(restingOrder);
			}
		}
		
		if (aggressiveOrder.quantity > 0)
		{
			book.addOrder(aggressiveOrder);
		}

		return aggressiveOrder.id;
	};

	Engine.prototype.getStatus = function(orderId) {
		var order = this.orders[orderId];
		return order ? 
		{
			status: order.status,
			workingQuantity: order.quantity
		}
		: undefined;
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
		var book = order.isBuy ? this.bids : this.offers;
		book.removeOrder(order);
		order.status = "Cancelled";

		return true;
	};

	Engine.prototype.getMarketData = function() {
		var levelReduce = function(order1, order2) { 
			return { 
				quantity: 	order1.quantity + order2.quantity, 
				price: 		order1.price}
			};
		var levelConverter = function(level) { return level.reduce(levelReduce) };

		debugger;
		var bids = this.bids.map(levelConverter);
		var offers = this.offers.map(levelConverter);

		return {
			bids: 	bids,
			offers: offers
		};
	};

	return new Engine();
};

exports.createEngine = createEngine;