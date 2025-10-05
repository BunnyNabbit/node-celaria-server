const startServer = require("../index.js")

describe("index", () => {
	it("should import", () => {
		expect(typeof startServer).toBe("function")
	})
})
