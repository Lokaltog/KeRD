export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		return {
			orangeThreshold: 40,
			redThreshold: 10,

			electricCharge: {
				max: 0,
				current: 0,
				percent: 0,
			},
			monoPropellant: {
				max: 0,
				current: 0,
				percent: 0,
			},
			intakeAir: {
				max: 0,
				current: 0,
				percent: 0,
			},
			liquidFuel: {
				max: 0,
				current: 0,
				percent: 0,
			},
			oxidizer: {
				max: 0,
				current: 0,
				percent: 0,
			},
			xenonGas: {
				max: 0,
				current: 0,
				percent: 0,
			},
		}
	},
	created() {
		var watchResource = (key, dataObj) => {
			this.$watch(() => this.data[`r.resourceMax[${key}]`] + this.data[`r.resourceCurrent[${key}]`], () => {
				dataObj.max = this.data[`r.resourceMax[${key}]`]
				if (dataObj.max <= 0) {
					dataObj.max = 0
					dataObj.current = 0
					dataObj.percent = 0
					return
				}
				dataObj.current = this.data[`r.resourceCurrent[${key}]`]
				dataObj.percent = Math.ceil(dataObj.current / dataObj.max * 100)
			})
		}

		watchResource('ElectricCharge', this.electricCharge)
		watchResource('MonoPropellant', this.monoPropellant)
		watchResource('IntakeAir', this.intakeAir)
		watchResource('LiquidFuel', this.liquidFuel)
		watchResource('Oxidizer', this.oxidizer)
		watchResource('XenonGas', this.xenonGas)
	},
}
