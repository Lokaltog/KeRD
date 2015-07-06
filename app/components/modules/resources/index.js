export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		return {
			orangeThreshold: 40,
			redThreshold: 10,

			resources: [],
		}
	},
	created() {
		var watchResource = (label, key) => {
			var dataObj = {
				label: label,
				max: 0,
				current: 0,
				percent: 0,
			}
			this.resources.push(dataObj)

			this.$watch(() => this.data[`r.resourceMax[${key}]`] + this.data[`r.resource[${key}]`], () => {
				dataObj.max = this.data[`r.resourceMax[${key}]`]
				if (dataObj.max <= 0) {
					dataObj.max = null
					dataObj.current = null
					dataObj.percent = null
					return
				}
				dataObj.current = this.data[`r.resource[${key}]`]
				dataObj.percent = Math.ceil(dataObj.current / dataObj.max * 100)
			})
		}

		watchResource('ELEC',  'ElectricCharge')
		watchResource('MONO',  'MonoPropellant')
		watchResource('AIR',   'IntakeAir')
		watchResource('LIQF',  'LiquidFuel')
		watchResource('OXID',  'Oxidizer')
		watchResource('XENON', 'XenonGas')
	},
}
