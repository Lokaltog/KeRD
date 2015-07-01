var sin = Math.sin
var cos = Math.cos
var sqrt = Math.sqrt
var pi = Math.PI

export function deg2rad(degrees) {
	return degrees * pi / 180
}

export function rad2deg(radians) {
	return radians * 180 / pi
}

export function ll2cartesian(lat, lon, radius=1) {
	var phi = deg2rad(90 - lat)
	var theta = deg2rad(lon + 180)

	return {
		x: -(radius * sin(phi) * cos(theta)),
		y: (radius * cos(phi)),
		z: (radius * sin(phi) * sin(theta)),
	}
}

export function spherical2cartesian(rho, phi, theta) {
	return {
		x: rho * sin(theta) * cos(phi),
		y: rho * cos(theta),
		z: rho * sin(theta) * sin(phi),
	}
}

export function cartesian2spherical(x, y, z) {
	var x2 = x * x
	var y2 = y * y
	var z2 = z * z

	return {
		rho: sqrt(x2 + y2 + z2),
		theta: Math.acos(z / sqrt(x2 + y2 + z2)),
		phi: Math.atan(y / x),
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

export function debounce(func, wait=250, immediate=false) {
	// From http://davidwalsh.name/javascript-debounce-function
	var timeout
	return function() {
		var args = arguments
		var later = () => {
			timeout = null
			if (!immediate) {
				func.apply(this, args)
			}
		}
		var callNow = immediate && !timeout
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
		if (callNow) {
			func.apply(this, args)
		}
	}
}
