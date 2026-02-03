const { startServer } = require("../index.mts")

describe("index", () => {
	it("should import", () => {
		expect(typeof startServer).toBe("function")
	})
})
