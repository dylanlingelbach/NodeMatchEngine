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
	var status = engine.getStatus(id);
	assert.ok(status, "order status returned");
	assert.equal(status, "Working");
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
	assert.equal(status, "Cancelled");
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
	debugger;
	var sellId = engine.submitOrder({quantity: "-3", price: "2.5"});

	assert.ok(matched, "Match should have occurred.");

	var buyStatus = engine.getStatus(buyId);
	assert.equal(buyStatus, "Complete");
	var sellStatus = engine.getStatus(sellId);
	assert.equal(sellStatus, "Complete");
};


for (var test in tests) {
	if (tests.hasOwnProperty(test)) {
		try{
			tests[test]();
			console.info("Passed: " + test);
		} catch (e) {
			console.error("Failed: " + test + " Error: " + e);
		}
	}
}