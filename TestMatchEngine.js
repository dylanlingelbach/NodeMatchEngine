assert = require("assert")
matchEngine = require("./MatchEngine.js")
console = require("console")

var tests = {};
tests.createEngine = function() {
	var engine = matchEngine.createEngine();
	assert.ok(engine, "Engine created");
};
tests.submitBuyOrder = function() {
	var engine = matchEngine.createEngine();
	var id = engine.submitOrder({quantity: "3", price: "2.5"});
	assert.ok(id, "order id returned");
};
tests.submitMultipleBuyOrders = function() {
	var engine = matchEngine.createEngine();
	var id1 = engine.submitOrder({quantity: "3", price: "2.5"});
	var id2 = engine.submitOrder({quantity: "3", price: "2.5"});
	assert.ok(id1, "order id returned");
	assert.ok(id2, "order id returned");
	assert.notEqual(id1, id2, "Order ids must be unique");
};
tests.zeroQuantityOrder = function() {
	var engine = matchEngine.createEngine();
	assert.throws(function() { engine.submitOrder({quantity: 0, price: "2.5"})}, Error);
}
tests.canCheckOrderStatus = function() {
	var engine = matchEngine.createEngine();
	var id = engine.submitOrder({quantity: "3", price: "2.5"});
	debugger;
	var status = engine.getStatus(id);
	assert.ok(status, "order status returned");
	assert.equal(status.status, "Working");
};
tests.checkUnknownOrderStatus = function() {
	var engine = matchEngine.createEngine();
	var status = engine.getStatus("1");
	assert.ok(!status, "No status should be returned for unknown order");
};
tests.canCancelOrder = function() {
	var engine = matchEngine.createEngine();
	var id = engine.submitOrder({quantity: "3", price: "2.5"});
	var result = engine.cancelOrder(id);
	assert.ok(result, "cancel should succeed");
	var status = engine.getStatus(id);
	assert.equal(status.status, "Cancelled");
};
tests.cancelOrderTwice = function() {
	var engine = matchEngine.createEngine();
	var id = engine.submitOrder({quantity: "3", price: "2.5"});
	engine.cancelOrder(id);
	var result = engine.cancelOrder(id);
	assert.ok(!result, "cancel should return false when called for the same order");
};
tests.cancelNonExistentOrder = function() {
	var engine = matchEngine.createEngine();
	var result = engine.cancelOrder("1");
	assert.ok(!result, "cancel should not succeed");
};
tests.matchRaisesEvent = function() {
	var engine = matchEngine.createEngine();
	var matched = false;
	var buyId = engine.submitOrder({quantity: "3", price: "2.5"});
	engine.on("match", function(restingOrder, aggressiveOrder, price, quantity) {
		assert.equal(restingOrder.id, buyId, "Resting order should be buy order");
		assert.equal(price, "2.5");
		assert.equal(quantity, 3);

		matched = true;
	});

	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});

	assert.ok(matched, "Match should have occurred.");

	var buyStatus = engine.getStatus(buyId);
	assert.equal(buyStatus.status, "Complete");
	var sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Complete");
};
tests.cancelPreventsMatch = function() {
	var engine = matchEngine.createEngine();
	var buyId = engine.submitOrder({quantity: "3", price: "2.5"});
	engine.on("match", function() {
		assert.fail("Should not match after a cancel.")
	});

	engine.cancelOrder(buyId);

	engine.submitOrder({quantity: "-3", price: "2.5"});
};
tests.matchAfterCancelRaisesEvent = function() {
	var engine = matchEngine.createEngine();
	var matched = false;
	var buyOrder = {quantity: "3", price: "2.5"};
	var buyId = engine.submitOrder(buyOrder);
	engine.cancelOrder(buyId);
	buyId = engine.submitOrder(buyOrder);

	engine.on("match", function(restingOrder, aggressiveOrder, price, quantity) {
		assert.equal(restingOrder.id, buyId, "Resting order should be buy order");
		assert.equal(price, "2.5");
		assert.equal(quantity, 3);

		matched = true;
	});

	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});

	assert.ok(matched, "Match should have occurred.");

	var buyStatus = engine.getStatus(buyId);
	assert.equal(buyStatus.status, "Complete");
	var sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Complete");
};
tests.aggressiveSweepRaisesEvents = function() {
	var engine = matchEngine.createEngine();
	var buyId1 = engine.submitOrder({quantity: "1", price: "2.7"});
	var buyId2 = engine.submitOrder({quantity: "1", price: "2.6"});
	var buyId3 = engine.submitOrder({quantity: "1", price: "2.5"});
	var restingIds = [buyId1, buyId2, buyId3];
	var prices = [2.7, 2.6, 2.5];
	var quantities = [1, 1, 1];
	var matchCount = 0;
	engine.on("match", function(restingOrder, aggressiveOrder, price, quantity) {
		var id = restingIds[matchCount];
		var price = prices[matchCount];
		var quantity = quantities[matchCount];
		assert.equal(restingOrder.id, id, "Resting order should be buy order");
		assert.equal(price, price, "Prices should match");
		assert.equal(quantity, quantity, "Quantities should match");

		matchCount = matchCount + 1;
	});

	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});

	assert.equal(matchCount, 3, "Three matches should have occurred.");

	var buyStatus = engine.getStatus(buyId1);
	assert.equal(buyStatus.status, "Complete");
	buyStatus = engine.getStatus(buyId2);
	assert.equal(buyStatus.status, "Complete");
	buyStatus = engine.getStatus(buyId3);
	assert.equal(buyStatus.status, "Complete");
	var sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Complete");
};
tests.partialsRaiseEvents = function() {
	var engine = matchEngine.createEngine();
	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});
	var restingIds = [sellId, sellId, sellId];
	var prices = [2.7, 2.6, 2.5];
	var quantities = [1, 1, 1];
	var matchCount = 0;
	engine.on("match", function(restingOrder, aggressiveOrder, price, quantity) {
		var id = restingIds[matchCount];
		var price = prices[matchCount];
		var quantity = quantities[matchCount];
		assert.equal(restingOrder.id, id, "Resting order should match expected");
		assert.equal(price, price, "Prices should match");
		assert.equal(quantity, quantity, "Quantities should match");

		matchCount = matchCount + 1;
	});

	var buyId1 = engine.submitOrder({quantity: "1", price: "2.7"});
	var sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Working");
	assert.equal(sellStatus.workingQuantity, 2);

	var buyId2 = engine.submitOrder({quantity: "1", price: "2.6"});
	sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Working");
	assert.equal(sellStatus.workingQuantity, 1);

	var buyId3 = engine.submitOrder({quantity: "1", price: "2.5"});

	assert.equal(matchCount, 3, "Three matches should have occurred.");

	var buyStatus = engine.getStatus(buyId1);
	assert.equal(buyStatus.status, "Complete");
	buyStatus = engine.getStatus(buyId2);
	assert.equal(buyStatus.status, "Complete");
	buyStatus = engine.getStatus(buyId3);
	assert.equal(buyStatus.status, "Complete");
	sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Complete");
};
tests.cancelAfterPartialClearsBook = function() {
	var engine = matchEngine.createEngine();
	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});

	engine.submitOrder({quantity: "1", price: "2.7"});
	engine.submitOrder({quantity: "1", price: "2.6"});

	engine.cancelOrder(sellId);

	engine.on("match", function(restingOrder, aggressiveOrder, price, quantity) {
		assert.fail("Should not match after cancel");
	});

	engine.submitOrder({quantity: "1", price: "2.5"});
};
tests.resubmitAfterMatchDoesNotMatch = function() {
	var engine = matchEngine.createEngine();
	engine.submitOrder({quantity: "3", price: "2.5"});
	engine.submitOrder({quantity: "-3", price: "2.5"});

	engine.on("match", function(restingOrder, aggressiveOrder, price, quantity) {
		assert.fail("Should not match against empty book")
	});

	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});

	var sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus.status, "Working");
};

for (var test in tests) {
	if (tests.hasOwnProperty(test) && (typeof tests[test] == 'function')) {
		try{
			tests[test]();
			console.info("Passed: " + test);
		} catch (e) {
			console.error("Failed: " + test + " Error: " + e);
		}
	}
}