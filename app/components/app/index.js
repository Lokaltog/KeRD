import numeral from 'numeral'
import WS from 'websocket'
import subscriptions from 'resources/subscriptions'

export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	components: {
		layout: require('../layout'),

		actiongroups: require('../modules/actiongroups'),
		history: require('../modules/history'),
		map: require('../modules/map'),
		navigation: require('../modules/navigation'),
		orbit: require('../modules/orbit'),
	},
	data() {
		var refreshRate = 1

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
				'module-config': config,
			}
		}

		return {
			config: {
				host: '10.0.0.110',
				port: 8085,
				refreshRate: refreshRate,
				refreshInterval: parseInt(1 / refreshRate * 1000),
				rendering: {
					fps: 60,
					useNormalMaps: true,
					useSpecularMaps: true,
					showSkybox: true,
					showLensFlare: true,
				},
			},

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
				    ),
				    section(module('navigation'))
			    )
		],
		}
	},
	created() {
		this.ws = new WS(`ws://${this.config.host}:${this.config.port}/datalink`)
		this.ws.addOpenHandler(() => {
			this.wsConnected = true

			// Subscribe to data from Telemachus
			this.ws.send({rate: this.config.refreshInterval, '+': subscriptions})
		})
		this.ws.addCloseHandler(() => this.wsConnected = false)
		this.ws.addMessageHandler(ev => {
			var msg = JSON.parse(ev.data)
			console.debug('Received message from Telemachus:', msg)

			Object.keys(msg).forEach(k => {
				if (!this.data[k]) {
					this.data.$add(k, null)
				}
				this.data[k] = msg[k]
			})
		})
		this.ws.connect().fail(msg => console.error(msg))
	},
	methods: {
		numeral: numeral,
	},
}
