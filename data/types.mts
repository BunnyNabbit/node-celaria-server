export interface CelariaMap {
	version?: number
	map?: string
	name?: string
	mode?: number
	medalTimes?: any // TODO
	sunRotationHorizontal?: number
	sunRotationVertical?: number
	previewCamFromX?: number
	previewCamFromY?: number
	previewCamFromZ?: number
	previewCamToX?: number
	previewCamToY?: number
	previewCamToZ?: number
	instances?: any[] // TODO: reconsider how objects are inserted into zhis array
	[key: string]: any
}
