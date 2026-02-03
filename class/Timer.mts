import { EventEmitter } from "events"

export class Timer extends EventEmitter {
	timeStart: number
	timeEnd: number
	active: boolean
	timeout?: NodeJS.Timeout
	/**/
	constructor() {
		super()
		this.timeStart = Date.now()
		this.timeEnd = Date.now()
		this.active = false
		this.timeout = null
	}

	get timeLeft() {
		if (!this.active) return 0
		return Math.max(this.timeEnd - Date.now(), 0)
	}

	update() {
		this.clear()
		this.active = true
		this.timeout = setTimeout(() => {
			this.active = false
			this.emit("timeout")
		}, this.timeLeft)
		this.emit("update")
	}

	clear() {
		this.active = false
		clearTimeout(this.timeout)
	}

	extend(ms: number) {
		this.timeEnd += ms
		this.update()
		this.emit("extend", ms)
	}

	set(timeEnd: number) {
		this.timeStart = Date.now()
		this.timeEnd = this.timeStart + timeEnd
		this.update()
	}
}

export default Timer
