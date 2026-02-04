// @ts-check
import { SmartBuffer } from "smart-buffer"
/** @import {CelariaMap} from "./types.mjs" */

/**@todo Yet to be documented.
 *
 * @param {Buffer} buffer
 * @returns
 */
export function parseCelariaMap(buffer) {
	/** @type {CelariaMap} */
	const map = {}
	const smartBuffer = SmartBuffer.fromBuffer(buffer)
	const magic = smartBuffer.readString(11)
	if (magic === "celaria_map") {
		map.version = smartBuffer.readUInt8() // Version

		map.name = smartBuffer.readString(smartBuffer.readUInt8())

		if (map.version == 0) smartBuffer.readInt8() // unused byte

		map.mode = smartBuffer.readUInt8() // unused byte (is it really? it's used in validation inside the server code but not client)

		const numCheckpoints = smartBuffer.readInt8()

		map.medalTimes = []

		for (let i = 0; i < numCheckpoints; i++) {
			map.medalTimes.push({
				platin: smartBuffer.readUInt32LE(),
				gold: smartBuffer.readUInt32LE(),
				silver: smartBuffer.readUInt32LE(),
				bronze: smartBuffer.readUInt32LE(),
			})
		}

		map.sunRotationHorizontal = smartBuffer.readFloatLE()
		map.sunRotationVertical = smartBuffer.readFloatLE()

		map.previewCamFromX = smartBuffer.readDoubleLE()
		map.previewCamFromY = smartBuffer.readDoubleLE()
		map.previewCamFromZ = smartBuffer.readDoubleLE()

		map.previewCamToX = smartBuffer.readDoubleLE()
		map.previewCamToY = smartBuffer.readDoubleLE()
		map.previewCamToZ = smartBuffer.readDoubleLE()

		const instanceCount = smartBuffer.readUInt32LE()

		map.instances = []

		for (let i = 0; i < instanceCount; i++) {
			const instance = {
				instanceType: smartBuffer.readUInt8(),
			}
			switch (instance.instanceType) {
				case 0: // block
					instance.blockType = smartBuffer.readUInt8()
					if (map.version == 0) smartBuffer.readUInt8() // unused byte

					if (map.version <= 1) {
						instance.position = {
							x: smartBuffer.readInt32LE() / 10,
							y: smartBuffer.readInt32LE() / 10,
							z: smartBuffer.readUInt32LE() / 10,
						}

						instance.scale = {
							x: smartBuffer.readUInt32LE() / 10,
							y: smartBuffer.readUInt32LE() / 10,
							z: smartBuffer.readUInt32LE() / 10,
						}
					} else {
						instance.position = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: smartBuffer.readDoubleLE(),
						}

						instance.scale = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: smartBuffer.readDoubleLE(),
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: smartBuffer.readFloatLE(),
					}

					if (instance.blockType === 5) instance.checkpointId = smartBuffer.readUInt8()
					break

				case 1: // Sphere/gem
					if (map.version <= 1) {
						instance.position = {}
						instance.position.x = smartBuffer.readInt32LE() / 10
						instance.position.y = smartBuffer.readInt32LE() / 10
						if (map.version == 0) {
							instance.position.z = smartBuffer.readInt32LE() / 10
						} else {
							instance.position.z = smartBuffer.readUInt32LE() / 10
						}
					} else {
						instance.position = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: smartBuffer.readDoubleLE(),
						}
					}
					break
				case 2: // Player spawn
					smartBuffer.readUInt8() // unused byte

					if (map.version <= 1) {
						instance.position = {}
						instance.position.x = smartBuffer.readInt32LE() / 10
						instance.position.y = smartBuffer.readInt32LE() / 10
						if (map.version == 0) {
							instance.position.z = smartBuffer.readInt32LE() / 10
						} else {
							instance.position.z = smartBuffer.readUInt32LE() / 10
						}
					} else {
						instance.position = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: smartBuffer.readDoubleLE(),
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: smartBuffer.readFloatLE(),
					}
					break

				case 3: // Barrier (wall)
					smartBuffer.readUInt8() // unused byte

					if (map.version >= 2) {
						instance.position = {
							x: smartBuffer.readInt32LE() / 10,
							y: smartBuffer.readInt32LE() / 10,
							z: smartBuffer.readUInt32LE() / 10,
						}

						instance.scale = {
							x: smartBuffer.readUInt32LE() / 10,
							y: 0,
							z: smartBuffer.readUInt32LE() / 10,
						}
					} else {
						instance.position = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: smartBuffer.readDoubleLE(),
						}

						instance.scale = {
							x: smartBuffer.readDoubleLE(),
							y: 0,
							z: smartBuffer.readDoubleLE(),
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: smartBuffer.readFloatLE(),
					}
					break
				case 4: // Barrier (floor)
					smartBuffer.readUInt8() // unused byte

					if (map.version >= 2) {
						instance.position = {
							x: smartBuffer.readInt32LE() / 10,
							y: smartBuffer.readInt32LE() / 10,
							z: smartBuffer.readUInt32LE() / 10,
						}

						instance.scale = {
							x: smartBuffer.readUInt32LE() / 10,
							y: smartBuffer.readUInt32LE() / 10,
							z: 0,
						}
					} else {
						instance.position = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: smartBuffer.readDoubleLE(),
						}

						instance.scale = {
							x: smartBuffer.readDoubleLE(),
							y: smartBuffer.readDoubleLE(),
							z: 0,
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: smartBuffer.readFloatLE(),
					}
					break
				case 128: // Special
					const id = smartBuffer.readUInt8()

					if (map.version <= 1) {
						const xPos = smartBuffer.readInt32LE()
						const yPos = smartBuffer.readInt32LE()
						const zPos = smartBuffer.readUInt32LE()

						const xScale = smartBuffer.readUInt32LE()
						const yScale = smartBuffer.readUInt32LE()
						const zScale = smartBuffer.readUInt32LE()
					} else {
						const xPos = smartBuffer.readDoubleLE()
						const yPos = smartBuffer.readDoubleLE()
						const zPos = smartBuffer.readDoubleLE()

						const xScale = smartBuffer.readDoubleLE()
						const yScale = smartBuffer.readDoubleLE()
						const zScale = smartBuffer.readDoubleLE()
					}

					const rotation = smartBuffer.readFloatLE()
					break

				default:
					break
			}
			map.instances.push(instance)
		}
		return map
	} else {
		throw "Map provided wasn't a .ecmap"
	}
}

// TODO: Many of the map data to write should be optional and have default values for everything to "just work" if the map alone has no checkpoint data, sun or name and just the map blocks.
/**@todo Yet to be documented.
 *
 * @param {CelariaMap} map
 */
export function writeCelariaMap(map, version = 3) {
	// this can modify the original object
	if (!map.instances)
		map.instances = [
			{
				instanceType: 2,
				position: { x: 0, y: 0, z: 0 },
				rotation: { z: 0 },
			},
		]

	const output = new SmartBuffer()
	output.writeString("celaria_map")
	output.writeUInt8(version) // Version

	// Might be a temp file on someone's computer never to be normally seen again
	const mapName = "DELETE_ME" //map.name ?? "DELETE_ME"
	output.writeUInt8(mapName.length)
	output.writeString(mapName)

	if (version == 0) output.writeUInt8(0) // unused byte
	output.writeUInt8(1) // Mode byte: Must be 1 for Celaria server (Java) to work. Otherwise doesn't matter

	const numCheckpoints = map.instances.filter((instance) => instance.instanceType === 0 && (instance.blockType === 5 || instance.blockType === 1)).length
	output.writeUInt8(numCheckpoints)
	for (let i = 0; i < numCheckpoints; i++) {
		// Purposefully have impossible to beat times for maps written by cmapLib.js
		output.writeUInt32LE(1)
		output.writeUInt32LE(2)
		output.writeUInt32LE(3)
		output.writeUInt32LE(4)
	}

	output.writeFloatLE(map.sunRotationHorizontal ?? 40)
	output.writeFloatLE(map.sunRotationVertical ?? 60)

	output.writeDoubleLE(map.previewCamFromX ?? 20)
	output.writeDoubleLE(map.previewCamFromY ?? 30)
	output.writeDoubleLE(map.previewCamFromZ ?? 40)

	output.writeDoubleLE(map.previewCamToX ?? 200)
	output.writeDoubleLE(map.previewCamToY ?? 300)
	output.writeDoubleLE(map.previewCamToZ ?? 200)

	output.writeUInt32LE(map.instances.length)

	// write data
	map.instances.forEach((instance) => {
		if (!instanceTypeIsSupported(instance.instanceType, version)) return
		output.writeUInt8(instance.instanceType)
		switch (instance.instanceType) {
			case 0: // block
				output.writeUInt8(instance.blockType)
				if (version == 0) output.writeUInt8(0) // unused byte

				if (version <= 1) {
					output.writeInt32LE(instance.position.x * 10)
					output.writeInt32LE(instance.position.y * 10)
					output.writeUInt32LE(instance.position.z * 10)

					output.writeUInt32LE(instance.scale.x * 10)
					output.writeUInt32LE(instance.scale.y * 10)
					output.writeUInt32LE(instance.scale.z * 10)
				} else {
					output.writeDoubleLE(instance.position.x)
					output.writeDoubleLE(instance.position.y)
					output.writeDoubleLE(instance.position.z)

					output.writeDoubleLE(instance.scale.x)
					output.writeDoubleLE(instance.scale.y)
					output.writeDoubleLE(instance.scale.z)
				}

				output.writeFloatLE(instance.rotation.z)

				if (instance.blockType === 5) output.writeUInt8(instance.checkpointId)
				break

			case 1: // Sphere/gem/collectible/schmilblick
				if (version <= 1) {
					output.writeInt32LE(instance.position.x * 10)
					output.writeInt32LE(instance.position.y * 10)
					if (version == 0) {
						output.writeInt32LE(instance.position.z * 10)
					} else {
						output.writeUInt32LE(instance.position.z * 10)
					}
				} else {
					output.writeDoubleLE(instance.position.x)
					output.writeDoubleLE(instance.position.y)
					output.writeDoubleLE(instance.position.z)
				}
				break
			case 2: // Player spawn
				output.writeUInt8(0) // unused byte

				if (version <= 1) {
					output.writeInt32LE(instance.position.x * 10)
					output.writeInt32LE(instance.position.y * 10)
					if (version == 0) {
						output.writeInt32LE(instance.position.z * 10)
					} else {
						output.writeUInt32LE(instance.position.z * 10)
					}
				} else {
					output.writeDoubleLE(instance.position.x)
					output.writeDoubleLE(instance.position.y)
					output.writeDoubleLE(instance.position.z)
				}

				output.writeFloatLE(instance.rotation.z)
				break

			case 3: // Barrier (wall)
				output.writeUInt8(0) // unused byte

				if (version === 3) {
					output.writeInt32LE(instance.position * 10)
					output.writeInt32LE(instance.position * 10)
					output.writeUInt32LE(instance.position * 10)

					output.writeUInt32LE(instance.scale.x * 10)
					output.writeUInt32LE(instance.scale.z * 10)
				} else {
					output.writeDoubleLE(instance.position.x)
					output.writeDoubleLE(instance.position.y)
					output.writeDoubleLE(instance.position.z)

					output.writeDoubleLE(instance.scale.x)
					output.writeDoubleLE(instance.scale.z)
				}

				output.writeFloatLE(instance.rotation.z)
				break
			case 4: // Barrier (floor)
				output.writeUInt8(0) // unused byte

				if (version === 3) {
					output.writeInt32LE(instance.position * 10)
					output.writeInt32LE(instance.position * 10)
					output.writeUInt32LE(instance.position * 10)

					output.writeUInt32LE(instance.scale.x * 10)
					output.writeUInt32LE(instance.scale.y * 10)
				} else {
					output.writeDoubleLE(instance.position.x)
					output.writeDoubleLE(instance.position.y)
					output.writeDoubleLE(instance.position.z)

					output.writeDoubleLE(instance.scale.x)
					output.writeDoubleLE(instance.scale.y)
				}

				output.writeFloatLE(instance.rotation.z)
				break
			default:
				break
		}
	})

	return output.toBuffer()
}

// TODO: Again, this uses the .ecmap versions (0 - 4)
/**@todo Yet to be documented.
 *
 * @param {any} instanceType
 * @param {number} version
 */
function instanceTypeIsSupported(instanceType, version) {
	switch (instanceType) {
		case 3:
			if (version < 3) return false
			break
		case 4:
			if (version < 3) return false
			break

		default:
			break
	}

	return true
}
