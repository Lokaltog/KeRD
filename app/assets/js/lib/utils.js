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

export function wrapDegDelta(delta) {
	// Applying this function to a sphere rotation delta ensures that the
	// rotation of a sphere rotates the shortest distance possible (i.e. when
	// wrapping from 359->0deg it will return a delta of +1 instead of -359)
	if (delta > 180) {
		delta = delta - 360
	}
	else if (delta < -180) {
		delta = 360 + delta
	}
	return delta
}
