import THREE from 'three'

var sin = Math.sin
var cos = Math.cos
var sqrt = Math.sqrt
var pi = Math.PI
var pow = Math.pow

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

export function orbitalElements2Cartesian(ratio,
                                          trueAnomaly,
                                          eccentricity,
                                          semimajorAxis,
                                          inclination,
                                          longitudeOfAscendingNode,
                                          argumentOfPeriapsis) {
	// Convert orbital elements to cartesian coordinates
	// All angles in degrees
	var ta = deg2rad(trueAnomaly)
	var i = deg2rad(inclination)
	var w = deg2rad(argumentOfPeriapsis)
	var omega = deg2rad(longitudeOfAscendingNode)
	var r = ratio * semimajorAxis * (1 - pow(eccentricity, 2)) / (1 + eccentricity * cos(ta))
	var ta_w = ta + w

	return {
		x: r * (cos(omega) * cos(ta_w) - sin(omega) * sin(ta_w) * cos(i)),
		y: r * (sin(omega) * cos(ta_w) + cos(omega) * sin(ta_w) * cos(i)),
		z: r * (sin(ta_w) * sin(i)),
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

export function objScreenPosition(obj, camera, renderer) {
	var vector = new THREE.Vector3()
	var widthHalf = 0.5 * renderer.context.canvas.width
	var heightHalf = 0.5 * renderer.context.canvas.height

	obj.updateMatrixWorld()
	vector.setFromMatrixPosition(obj.matrixWorld)
	vector.project(camera)

	vector.x = (vector.x * widthHalf) + widthHalf
	vector.y = -(vector.y * heightHalf) + heightHalf

	return {
		x: vector.x,
		y: vector.y,
	}
}
