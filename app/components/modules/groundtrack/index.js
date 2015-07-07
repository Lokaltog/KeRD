import $ from 'jquery'
import d3 from 'd3'
import sylvester from 'exports?$V&$M!sylvester'
import {debounce, deg2rad, rad2deg} from 'utils'

Math.sinh = Math.sinh || function(x) {
	return (Math.exp(x) - Math.exp(-x)) / 2
}

Math.atanh = Math.atanh || function(x) {
	return Math.log((1 + x) / (1 - x)) / 2
}

class GroundTrack {
	// Class to plot ground tracks on a equirectangular map
	//
	// Thanks to @Arrowstar for the original Matlab algorithm and @Gaiiden for the JS implementation
	// https://github.com/Arrowstar/ksptot
	// https://github.com/Gaiiden/FlightTracker
	constructor(maxOrbits=3, pointDeltaTime=50.0, maxDeltaTime=100000) {
		this.maxOrbits = maxOrbits
		this.pointDeltaTime = pointDeltaTime
		this.maxDeltaTime = maxDeltaTime
	}

	angleZero2Pi(a) {
		return Math.abs(a - (2 * Math.PI) * Math.floor(a / (2 * Math.PI)))
	}

	getTrack(universalTime, gravParameter, semimajorAxis, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPeriapsis, trueAnomaly, period, rotPeriod, epoch, radius) {
		inclination = deg2rad(inclination)
		longitudeOfAscendingNode = deg2rad(longitudeOfAscendingNode)
		argumentOfPeriapsis = deg2rad(argumentOfPeriapsis)
		trueAnomaly = deg2rad(trueAnomaly)

		// Compute mean anomaly from true anomaly
		var meanAnomaly = 0
		var eccentricAnomaly
		if (eccentricity < 1) {
			eccentricAnomaly = (Math.atan2(Math.sqrt(1 - Math.pow(eccentricity, 2)) * Math.sin(trueAnomaly), eccentricity + Math.cos(trueAnomaly)))
			if (trueAnomaly < 2 * Math.PI) {
				eccentricAnomaly = this.angleZero2Pi(eccentricAnomaly)
			}
			meanAnomaly = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly)
			meanAnomaly = this.angleZero2Pi(meanAnomaly)
		}
		else {
			var num = Math.tan(trueAnomaly / 2)
			var denom = Math.pow((eccentricity + 1) / (eccentricity - 1), 0.5)
			var hyperA = 2 * Math.atanh(num / denom)
			meanAnomaly = eccentricity * Math.sinh(hyperA) - hyperA
		}

		// Compute ground track for time interval
		var maxElapsedTime = universalTime + (Math.round(period * this.maxOrbits))
		var currentTime = universalTime

		if (maxElapsedTime - currentTime > this.maxDeltaTime) {
			maxElapsedTime = currentTime + this.maxDeltaTime

			if (period > this.maxDeltaTime) {
				console.warn('Max delta time exceeded for ground track calculation')
			}
		}

		var ret = []
		while (currentTime <= maxElapsedTime) {
			// Adjust for motion since the time of this orbit
			var n = Math.sqrt(gravParameter / Math.pow(Math.abs(semimajorAxis), 3))
			var newMeanAnomaly = meanAnomaly + n * (currentTime - epoch)

			// Compute eccentric anomaly
			eccentricAnomaly = -1
			if (newMeanAnomaly < 0 || newMeanAnomaly > 2 * Math.PI) {
				newMeanAnomaly = this.angleZero2Pi(newMeanAnomaly)
			}

			if (Math.abs(newMeanAnomaly) < 1e-8) {
				eccentricAnomaly = 0
			}
			else if (Math.abs(newMeanAnomaly - Math.PI) < 1e-8) {
				eccentricAnomaly = Math.PI
			}

			if (eccentricAnomaly === -1) {
				var En = newMeanAnomaly
				var Ens = En - (En - eccentricity * Math.sin(En) - newMeanAnomaly) / (1 - eccentricity * Math.cos(En))
				while (Math.abs(Ens - En) < 1e-10) {
					En = Ens
					Ens = En - (En - eccentricity * Math.sin(En) - newMeanAnomaly) / (1 - eccentricity * Math.cos(En))
				}
				eccentricAnomaly = Ens
			}

			// Compute true anomaly from eccentric anomaly
			var upper = Math.sqrt(1 + eccentricity) * Math.tan(eccentricAnomaly / 2)
			var lower = Math.sqrt(1 - eccentricity)

			trueAnomaly = this.angleZero2Pi((Math.atan2(upper, lower) * 2 ))

			// Special case: Circular equatorial
			if (eccentricity < 1e-10 && (inclination < 1e-10 || Math.abs(inclination - Math.PI) < 1e-10)) {
				var l = longitudeOfAscendingNode + argumentOfPeriapsis + trueAnomaly
				trueAnomaly = l
				longitudeOfAscendingNode = 0
				argumentOfPeriapsis = 0
			}
			// Special case: Circular inclined
			if (eccentricity < 1e-10 && inclination >= 1e-10 && Math.abs(inclination - Math.pi) < 1e10) {
				var u = argumentOfPeriapsis + trueAnomaly
				trueAnomaly = u
				longitudeOfAscendingNode = 0
				argumentOfPeriapsis = 0
			}
			// Special case: Elliptical equatorial
			if (eccentricity >= 1e-10 && (inclination < 1e-10 || Math.abs(inclination - Math.pi) < 1e10)) {
				longitudeOfAscendingNode = 0
			}

			var p = semimajorAxis * (1 - (Math.pow(eccentricity, 2)))

			var rPQW = sylvester.$V([
				p * Math.cos(trueAnomaly) / (1 + eccentricity * Math.cos(trueAnomaly)),
				p * Math.sin(trueAnomaly) / (1 + eccentricity * Math.cos(trueAnomaly)),
				0,
			])
			//var vPQW = sylvester.$V([
			//	-Math.sqrt(gravParameter / p) * Math.sin(trueAnomaly),
			//	-Math.sqrt(gravParameter / p) * (eccentricity + Math.cos(trueAnomaly)),
			//	0,
			//])
			var transMatrix = sylvester.$M([
				[
					Math.cos(longitudeOfAscendingNode) * Math.cos(argumentOfPeriapsis) - Math.sin(longitudeOfAscendingNode) * Math.sin(argumentOfPeriapsis) * Math.cos(inclination),
						-Math.cos(longitudeOfAscendingNode) * Math.sin(argumentOfPeriapsis) - Math.sin(longitudeOfAscendingNode) * Math.cos(argumentOfPeriapsis) * Math.cos(inclination),
					Math.sin(longitudeOfAscendingNode) * Math.sin(inclination),
				],
				[
					Math.cos(longitudeOfAscendingNode) * Math.cos(argumentOfPeriapsis) - Math.sin(longitudeOfAscendingNode) * Math.sin(argumentOfPeriapsis) * Math.cos(inclination),
						-Math.sin(longitudeOfAscendingNode) * Math.sin(argumentOfPeriapsis) + Math.cos(longitudeOfAscendingNode) * Math.cos(argumentOfPeriapsis) * Math.cos(inclination),
						-Math.cos(longitudeOfAscendingNode) * Math.sin(inclination),
				],
				[
					Math.sin(argumentOfPeriapsis) * Math.sin(inclination),
					Math.cos(argumentOfPeriapsis) * Math.sin(inclination),
					Math.cos(inclination),
				],
			])
			var rVect = transMatrix.multiply(rPQW)
			//var vVect = transMatrix.multiply(vPQW)

			// Compute body spin angle
			var bodySpinRate = 2 * Math.PI / rotPeriod
			// FIXME set the correct rotInit field if available? (body rotation at t=0)
			var rotInit = deg2rad(0)
			var spinAngle = this.angleZero2Pi(rotInit + bodySpinRate * currentTime)

			// Get fixed frame vectors from inertial vectors
			var R = sylvester.$M([
				[Math.cos(spinAngle), -Math.sin(spinAngle), 0],
				[Math.sin(spinAngle), Math.cos(spinAngle), 0],
				[0, 0, 1],
			])
			R = R.transpose()
			var rVectECEF = R.multiply(rVect)

			// Get lat/long from inertial vectors
			// 2-norm or Euclidean norm of vector
			var rNorm = Math.sqrt(Math.pow(rVectECEF.e(1), 2) + Math.pow(rVectECEF.e(2), 2) + Math.pow(rVectECEF.e(3), 2))

			var lon = rad2deg(this.angleZero2Pi(Math.atan2(rVectECEF.e(2), rVectECEF.e(1))))
			var lat = rad2deg(Math.PI / 2 - Math.acos(rVectECEF.e(3) / rNorm))
			//var alt = rNorm - radius
			//var vel = Math.sqrt(gravParameter * (2 / rNorm - 1 / semimajorAxis))

			// Convert longitude to proper range (-180 to 180)
			if (lon >= 180) {
				lon -= 360
			}

			ret.push({
				lat: lat,
				lon: lon,
				// alt: alt,
				// vel: vel,
			})

			currentTime += this.pointDeltaTime
		}
		return ret
	}
}

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	ready() {
		var gt = new GroundTrack()
		var $el = $('.groundtrack', this.$el)

		var svgW = 600
		var halfSvgW = svgW / 2
		var svgH = 300
		var halfSvgH = svgH / 2

		var graph = d3.select('.groundtrack')
			    .append('svg')
			    .attr('viewBox', `0 0 ${svgW} ${svgH}`)
			    .attr('preserveAspectRatio', 'xMinYMin meet')
			    .attr('width', svgW)
			    .attr('height', svgH)

		var line = d3.svg.line()
			    .x((d) => d.x)
			    .y((d) => d.y)
			    .interpolate('linear')

		graph.append('path')
			.attr('d', line([]))
			.attr('stroke', 'red')
			.attr('stroke-width', 2)
			.attr('fill', 'none')

		var resize = () => {
			$el.css('height', $el.width() / 2)
		}
		$(window).on('resize', debounce(() => resize()))
		resize()

		this.$once('resources.bodies.ready', () => this.$watch(() => this.data['v.long'] + this.data['v.lat'] + this.data['v.body'], () => {
			var body = this.resources.bodies[this.data['v.body']]
			var bodyData = body.data
			var w = $el.width()
			var halfW = w / 2
			var h = $el.height()
			var halfH = h / 2

			$('.groundtrack', this.$el).css('background-image', `url(${body.textures.lo.diffuse})`).css('background-size', 'contain')

			var latLong = gt.getTrack(
				this.data['t.universalTime'],
				bodyData.gravParameter,
				this.data['o.sma'],
				this.data['o.eccentricity'],
				this.data['o.inclination'],
				this.data['o.lan'],
				this.data['o.argumentOfPeriapsis'],
				this.data['o.trueAnomaly'],
				this.data['o.period'],
				bodyData.rotPeriod,
				this.data['t.universalTime'],
				bodyData.radius
			)

			var lineData = []
			var lastX = null
			var lastY = null
			var wrapMargin = 5

			latLong.forEach((ll) => {
				var x = (halfSvgW + ((ll.lon / 180) * halfSvgW))
				var y = (halfSvgH - ((ll.lat / 90) * halfSvgH))

				// Wrap lines around object outer objects between orbits (hackish solution to be able to use only one line)
				if (Math.abs(x - lastX) > halfW && lastX !== null) {
					lineData.push({x: w + wrapMargin, y: y})
					lineData.push({x: w + wrapMargin, y: h + wrapMargin})
					lineData.push({x: -wrapMargin, y: h + wrapMargin})
					lineData.push({x: -wrapMargin, y: y})
				}

				lineData.push({
					x: x,
					y: y,
				})

				lastX = x
				lastY = y
			})

			graph.selectAll('path').data([lineData]).attr('d', line)

			$('.vessel', this.$el).css({
				left: (halfW + ((latLong[0].lon / 180) * halfW)) / w * 100 + '%',
				top: (halfH - ((latLong[0].lat / 90) * halfH)) / h * 100 + '%',
			})
		}, { immediate: true }))
	},
}
