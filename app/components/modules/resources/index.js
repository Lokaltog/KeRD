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
		var watchResource = (label, key, critical, inverseThreshold) => {
			var dataObj = {
				label: label,
				max: 0,
				current: 0,
				percent: 0,
				critical: critical,
				inverseThreshold: inverseThreshold,
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

		watchResource('ABL',   'Ablator', true)
		watchResource('ELEC',  'ElectricCharge')
		watchResource('MONO',  'MonoPropellant')
		watchResource('AIR',   'IntakeAir')
		watchResource('LIQF',  'LiquidFuel')
		watchResource('OXID',  'Oxidizer')
		watchResource('XENON', 'XenonGas')

		watchResource('FOOD', 'Food', true)
		watchResource('H₂O',  'Water', true)
		watchResource('O₂',   'Oxygen', true)
		watchResource('CO₂',  'CarbonDioxide', true, true)
		watchResource('WST',  'Waste', true, true)
		watchResource('WSTW', 'WasteWater', true, true)
	},
	methods: {
		getBarColor(res) {
			if (res.inverseThreshold) {
				if (res.percent >= 100 - this.redThreshold) {
					return (res.critical ? 'red-critical' : 'red')
				}
				if (res.percent >= 100 - this.orangeThreshold) {
					return 'orange'
				}
				return 'green'
			}

			if (res.percent <= this.redThreshold) {
				return (res.critical ? 'red-critical' : 'red')
			}
			if (res.percent <= this.orangeThreshold) {
				return 'orange'
			}
			return 'green'
		},
	},
}
