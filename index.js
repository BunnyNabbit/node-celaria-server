const Server = require("./Server.js")

function startServer(props) {
	const server = new Server(props)
	server.start()
	return server
}

module.exports = startServer