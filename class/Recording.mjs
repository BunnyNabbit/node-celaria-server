// replaced by ReplayBuffer
import { Player } from "./Player.mjs"

export class Recording {
	/**/
	constructor(data) {
		this.player = null
		this.recording = false
		this.statusCallback = null
		this.data = {
			dataVersion: 0,
			username: "Celarian",
			avatar: {
				character: 0,
				colors: {
					visor: "#ffff00",
					armor: "#ffffff",
					skin: "#c0c0c0",
				},
			},
			startTime: new Date() - 0,
			replay: [],
		}
		if (typeof data === "string") {
			// Serialized data
			this.data = JSON.parse(data)
		} else {
			// A player
			this.player = data
			this.data.avatar = this.player.avatar
			this.data.username = this.player.username
		}
	}

	startRecordingPlayer() {
		if (!this.player) throw "Can't start recording without player attached"
		this.recording = true
		this.statusCallback = (status) => {
			this.addTic(status)
		}
		this.player.on("statusUpdate", this.statusCallback)
	}

	stopRecordingPlayer() {
		if (!this.player) throw "Can't stop recording without player attached"
		this.recording = false
		this.player.off("statusUpdate", this.statusCallback)
	}

	startPlayback(world) {
		const bot = new Player(null)
		bot.username = this.data.username
		bot.avatar = this.data.avatar
		world.server.newPlayer(bot)
		world.addPlayer(bot)

		this.data.replay.forEach((status) => {
			setTimeout(() => {
				bot.rawStatus = status
				bot.updateStateForOthers() // We don't use fakeUpdateStatus since the data is based from an actual player
			}, status.time - this.data.startTime)
		})

		setTimeout(
			() => {
				bot.destroy()
			},
			this.data.replay[this.data.replay.length - 1].time - this.data.startTime + 500
		)

		return bot
	}

	stopPlayback() {
		throw "nope"
	}

	addTic(status) {
		status.time = new Date() - 0
		this.data.replay.push(status)
	}
}

export default Recording
