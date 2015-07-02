import {bodies} from 'resources/bodies'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		return {
			throttleRotation: null,
			gForceRotation: null,
		}
	},
	created() {
		this.$watch(() => this.data['f.throttle'], () => {
			var percent = parseInt(this.data['f.throttle'] / 1 * 100) / 100
			var margin = 2
			var rotation = percent * (180 - margin * 2) - 90
			console.log(rotation)
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
	},
}
