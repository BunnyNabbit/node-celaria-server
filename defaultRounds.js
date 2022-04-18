// If a server is created with defaultEnabled set to true, this script will be used.

// node-celaria-server's default rounds system is around the same as any other unmodded server using the original server software but with extra features tacked on.
// These additional features are as follows
// + The server will record replays of players and start playing back those replays if the player has completed the level
// + Players are able to "rock the vote" to vote early on maps
// + The map order can be seen by using a command

module.exports = (server) => {
	server.on("playerJoin", (player) => {
	})
}