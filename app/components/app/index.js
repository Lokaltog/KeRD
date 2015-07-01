import numeral from 'numeral'
import WS from 'websocket'
import subscriptions from 'resources/subscriptions'

class LocalStorage {
	get(key) {
		var value = localStorage.getItem(key)
		if (typeof value !== 'undefined') {
			try {
				value = JSON.parse(value)
			}
			catch (e) {
				console.error('Invalid storage object')
				console.error(e)
			}
		}
	}
	set(key, value) {
		localStorage.setItem(key, value)
	}
}

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

			storage: new LocalStorage(),
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
					    section(module('map'))
				    )
			    )
			],
		}
	},
	created() {
		this.loadConfig()

		// Connect to Telemachus socket
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
		saveConfig: function() {
			this.storage.set('config', this.config)
		},
		loadConfig: function() {
			var config = this.storage.get('config')
			if (config) {
				Object.keys(config).forEach(k => {
					if (!this.config[k]) {
						this.config.$add(k, null)
					}
					this.config[k] = config[k]
				})
			}
		},
	},
}
