export function deg2rad(degrees) {
	return degrees * Math.PI / 180
}

export function rad2deg(radians) {
	return radians * 180 / Math.PI
}

export function ll2cartesian(lat, lon, radius=1) {
	var phi = deg2rad(90 - lat)
	var theta = deg2rad(lon + 180)

	return {
		x: -(radius * Math.sin(phi) * Math.cos(theta)),
		y: (radius * Math.cos(phi)),
		z: (radius * Math.sin(phi) * Math.sin(theta)),
	}
}
