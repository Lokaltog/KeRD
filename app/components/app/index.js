import numeral from 'numeral'
import WS from 'websocket'

export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	components: {
		layout: require('../layout'),

		actiongroups: require('../modules/actiongroups'),
		history: require('../modules/history'),
		map: require('../modules/map'),
		orbit: require('../modules/orbit'),
	},
	data() {
		// Layout wrapper functions
		function wrapper(type) {
			return function(...contents) {
				return {
					type: type,
					contents: contents
				}
			}
		}
		var row = wrapper('row')
		var col = wrapper('col')
		var section = wrapper('section')
		var module = function(id, config={}) {
			return {
				type: 'module',
				id: id,
				config: config,
			}
		}

		return {
			host: '127.0.0.1',
			port: 8085,
			refreshRate: 1,
			ws: null,
			wsConnected: false,

			data: {},

			layout: [
			    col(
				    row(
					    section(
						    row(
							    col(
								    module('actiongroups')
							    ) 
						    )
					    )
				    ),
				    row(
					    section(module('orbit'))
				    ),
				    row(
					    section(module('map')),
					    section(module('history'))
				    )
			    )
		],
		}
	},
	created() {
		this.ws = new WS(`ws://${this.host}:${this.port}/datalink`)

		this.ws.addOpenHandler(() => this.wsConnected = true)
		this.ws.addCloseHandler(() => this.wsConnected = false)
		this.ws.addMessageHandler(ev => {
			var msg = JSON.parse(ev.data)

			Object.keys(msg).forEach(k => {
				if (!this.data[k]) {
					this.data.$add(k, null)
				}
				this.data[k] = msg[k]
			})
		})

		this.ws.connect().fail(msg => console.error(msg))

		this.refreshInterval = parseInt(1 / this.refreshRate * 1000)

		// Subscribe to data from Telemachus
		this.ws.send({rate: this.refreshInterval, '+': [
			'v.long',
			'v.lat',
			'v.altitude',
			'v.heightFromTerrain',
			'v.orbitalVelocity',
			'v.surfaceVelocity',
			'o.PeA',
			'o.ApA',
			'o.timeToAp',
			'o.timeToPe',
			'o.inclination',
			'o.eccentricity',
			'o.epoch',
			'o.period',
			'tar.o.velocity',
			'o.sma',
			'o.lan',
			'o.trueAnomaly',
		]})
	},
	methods: {
		numeral: numeral,
	},
}
