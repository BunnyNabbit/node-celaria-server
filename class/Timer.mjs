// @ts-check
import { EventEmitter } from "events"
/** @todo Yet to be documented. */
export class Timer extends EventEmitter {
	/**/
	constructor() {
		super()
		/** @type {number} */
		this.timeStart = Date.now()
		/** @type {number} */
		this.timeEnd = Date.now()
		/** @type {boolean} */
		this.active = false
		/** @type {NodeJS.Timeout?} */
		this.timeout = null
	}
	/** @todo Yet to be documented. */
	get timeLeft() {
		if (!this.active) return 0
		return Math.max(this.timeEnd - Date.now(), 0)
	}
	/** @todo Yet to be documented. */
	update() {
		this.clear()
		this.active = true
		this.timeout = setTimeout(() => {
			this.active = false
			this.emit("timeout")
		}, this.timeLeft)
		this.emit("update")
	}
	/** @todo Yet to be documented. */
	clear() {
		this.active = false
		clearTimeout(this.timeout)
	}
	/**@todo Yet to be documented.
	 *
	 * @param {number} ms
	 */
	extend(ms) {
		this.timeEnd += ms
		this.update()
		this.emit("extend", ms)
	}
	/**@todo Yet to be documented.
	 *
	 * @param {number} timeEnd
	 */
	set(timeEnd) {
		this.timeStart = Date.now()
		this.timeEnd = this.timeStart + timeEnd
		this.update()
	}
}

export default Timer
