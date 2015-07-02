import {bodies} from 'resources/bodies'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		return {
			throttleRotation: null,
			gForceRotation: null,
			pressurePosition: null,

			gears: false,
			lights: false,
			brakes: false,
			rcs: false,
			sas: false,
			missionTime: null,
		}
	},
	created() {
		this.$watch(() => this.data['v.missionTime'], () => {
			var m = this.numeral(this.data['v.missionTime']).format('00:00:00')
			var utc = this.numeral(this.data['t.universalTime']).format('00:00:00')
			this.missionTime = `${utc} UTC T+${m}`
		})

		this.$watch(() => this.data['f.throttle'], () => {
			var percent = parseInt(this.data['f.throttle'] / 1 * 100) / 100
			var margin = 2
			var rotation = percent * (180 - margin * 2) - 90
			if (rotation !== this.throttleRotation) {
				// Avoids redrawing the SVG if nothing has changed
				this.throttleRotation = margin + rotation
			}
		})
		this.$watch(() => this.data['v.geeForce'], () => {
			var minThreshold = -5
			var maxThreshold = 15
			var val = this.data['v.geeForce']
			var range = Math.abs(minThreshold) + Math.abs(maxThreshold)

			if (val <= minThreshold) {
				val = minThreshold
			}
			if (val >= maxThreshold) {
				val = maxThreshold
			}

			// minThreshold is now lowest value on scale
			val += Math.abs(minThreshold)

			var percent = parseInt(val / range * 100) / 100
			var rotation = percent * 180 - 90
			if (rotation !== this.gForceRotation) {
				// Avoids redrawing the SVG if nothing has changed
				this.gForceRotation = rotation
			}
		})
		this.$watch(() => this.data['v.atmosphericDensity'], () => {
			var pressure = this.data['v.atmosphericDensity'] / bodies._atmDensity
			if (pressure <= 0) {
				pressure = 0
			}
			if (pressure >= 1) {
				pressure = 1
			}
			this.pressurePosition = pressure * 100
		})

		var watchBool = (key, vmKey) => {
			this.$watch(() => this.data[key], () => {
				try {
					this[vmKey] = this.data[key].toLowerCase() === 'true'
				}
				catch (e) {}
			})
		}
		watchBool('v.gearValue', 'gears')
		watchBool('v.lightValue', 'lights')
		watchBool('v.brakeValue', 'brakes')
		watchBool('v.rcsValue', 'rcs')
		watchBool('v.sasValue', 'sas')
	},
}
