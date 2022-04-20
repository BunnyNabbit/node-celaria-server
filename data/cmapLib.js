const smartbuffer = require("smart-buffer").SmartBuffer

function parseCelariaMap(buff) {
	const map = {}
	buff = smartbuffer.fromBuffer(buff)
	const magic = buff.readString(11)
	if (magic === "celaria_map") {
		map.version = buff.readUInt8() // Version

		map.name = buff.readString(buff.readUInt8())

		if (map.version == 0) buff.readInt8() // unused byte

		map.mode = buff.readUInt8() // unused byte (is it really? it's used in validation inside the server code but not client)

		const numCheckpoints = buff.readInt8()

		map.medalTimes = []

		for (let i = 0; i < numCheckpoints; i++) {
			map.medalTimes.push({
				platin: buff.readUInt32LE(),
				gold: buff.readUInt32LE(),
				silver: buff.readUInt32LE(),
				bronze: buff.readUInt32LE()
			})
		}

		map.sunRotationHorizontal = buff.readFloatLE()
		map.sunRotationVertical = buff.readFloatLE()

		map.previewCamFromX = buff.readDoubleLE()
		map.previewCamFromY = buff.readDoubleLE()
		map.previewCamFromZ = buff.readDoubleLE()

		map.previewCamToX = buff.readDoubleLE()
		map.previewCamToY = buff.readDoubleLE()
		map.previewCamToZ = buff.readDoubleLE()

		const instanceCount = buff.readUInt32LE()

		map.instances = []

		for (var i = 0; i < instanceCount; i++) {
			const instance = {}
			instance.instanceType = buff.readUInt8()
			switch (instance.instanceType) {
				case 0: // block
					instance.blockType = buff.readUInt8()
					if (map.version == 0) buff.readUInt8() // unused byte

					if (map.version <= 1) {
						instance.position = {
							x: buff.readInt32LE() / 10,
							y: buff.readInt32LE() / 10,
							z: buff.readUInt32LE() / 10
						}

						instance.scale = {
							x: buff.readUInt32LE() / 10,
							y: buff.readUInt32LE() / 10,
							z: buff.readUInt32LE() / 10
						}
					} else {
						instance.position = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: buff.readDoubleLE()
						}

						instance.scale = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: buff.readDoubleLE()
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: buff.readFloatLE()
					}

					if (instance.blockType === 5) instance.checkpointId = buff.readUInt8()
					break

				case 1: // Sphere/gem
					if (map.version <= 1) {
						instance.position = {}
						instance.position.x = buff.readInt32LE() / 10
						instance.position.y = buff.readInt32LE() / 10
						if (map.version == 0) {
							instance.position.z = buff.readInt32LE() / 10
						} else {
							instance.position.z = buff.readUInt32LE() / 10
						}
					} else {
						instance.position = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: buff.readDoubleLE()
						}
					}
					break
				case 2: // Player spawn
					buff.readUInt8() // unused byte

					if (map.version <= 1) {
						instance.position = {}
						instance.position.x = buff.readInt32LE() / 10
						instance.position.y = buff.readInt32LE() / 10
						if (map.version == 0) {
							instance.position.z = buff.readInt32LE() / 10
						} else {
							instance.position.z = buff.readUInt32LE() / 10
						}
					} else {
						instance.position = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: buff.readDoubleLE()
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: buff.readFloatLE()
					}
					break

				case 3: // Barrier (wall)
					buff.readUInt8() // unused byte

					if (map.version >= 2) {
						instance.position = {
							x: buff.readInt32LE() / 10,
							y: buff.readInt32LE() / 10,
							z: buff.readUInt32LE() / 10
						}

						instance.scale = {
							x: buff.readUInt32LE() / 10,
							y: 0,
							z: buff.readUInt32LE() / 10
						}
					} else {
						instance.position = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: buff.readDoubleLE()
						}

						instance.scale = {
							x: buff.readDoubleLE(),
							y: 0,
							z: buff.readDoubleLE()
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: buff.readFloatLE()
					}
					break
				case 4: // Barrier (floor)
					buff.readUInt8() // unused byte

					if (map.version >= 2) {
						instance.position = {
							x: buff.readInt32LE() / 10,
							y: buff.readInt32LE() / 10,
							z: buff.readUInt32LE() / 10
						}

						instance.scale = {
							x: buff.readUInt32LE() / 10,
							y: buff.readUInt32LE() / 10,
							z: 0
						}
					} else {
						instance.position = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: buff.readDoubleLE()
						}

						instance.scale = {
							x: buff.readDoubleLE(),
							y: buff.readDoubleLE(),
							z: 0
						}
					}

					instance.rotation = {
						x: 0,
						y: 0,
						z: buff.readFloatLE()
					}
					break
				case 128: // Special
					var id = buff.readUInt8()

					if (map.version <= 1) {
						var xPos = buff.readInt32LE()
						var yPos = buff.readInt32LE()
						var zPos = buff.readUInt32LE()

						var xScale = buff.readUInt32LE()
						var yScale = buff.readUInt32LE()
						var zScale = buff.readUInt32LE()
					} else {
						var xPos = buff.readDoubleLE()
						var yPos = buff.readDoubleLE()
						var zPos = buff.readDoubleLE()

						var xScale = buff.readDoubleLE()
						var yScale = buff.readDoubleLE()
						var zScale = buff.readDoubleLE()
					}

					var rotation = buff.readFloatLE()
					break

				default:
					break
			}
			map.instances.push(instance)
		}
		return map
	} else {
		if (magic === "celaria_map") throw "Map provided was a .cmap. ecmapLib.js does not yet support that file type and it is also highly unlikely that I will add conversion support otherwise."
		throw "Map provided wasn't a .ecmap"
	}
}

// TODO: Many of the map data to write should be optional and have default values for everything to "just work" if the map alone has no checkpoint data, sun or name and just the map blocks.
function writeCelariaMap(map, version = 3) {
	// this can modify the original object
	if (!map.instances) map.instances = [{
		instanceType: 2,
		position: { x: 0, y: 0, z: 0 },
		rotation: { z: 0 }
	}]

	output = new smartbuffer()
	output.writeString("celaria_map")
	output.writeUInt8(version) // Version

	// Might be a temp file on someone's computer never to be normally seen again
	const mapName = "DELETE_ME" //map.name ?? "DELETE_ME"
	output.writeUInt8(mapName.length)
	output.writeString(mapName)

	if (version == 0) output.writeUInt8(0) // unused byte
	output.writeUInt8(1) // Mode byte: Must be 1 for Celaria server (Java) to work. Otherwise doesn't matter

	const numCheckpoints = map.instances.filter(instance => instance.instanceType === 0 && (instance.blockType === 5 || instance.blockType === 1)).length
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
	map.instances.forEach(instance => {
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

module.exports = { parseCelariaMap, writeCelariaMap }