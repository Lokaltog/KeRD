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
		return value
	}
	set(key, value) {
		localStorage.setItem(key, JSON.stringify(value))
	}
	remove(key) {
		localStorage.removeItem(key)
	}
}

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

var storage = new LocalStorage()

export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	components: {
		layout: require('../layout'),
		settings: require('../settings'),

		actiongroups: require('../modules/actiongroups'),
		history: require('../modules/history'),
		map: require('../modules/map'),
		navigation: require('../modules/navigation'),
		orbit: require('../modules/orbit'),
		resources: require('../modules/resources'),
		vessel: require('../modules/vessel'),
	},
	data() {
		var config = storage.get('config')
		var refreshRate = config ? (config.refreshRate || 1) : 1

		return {
			config: config || {
				telemachus: {
					host: '10.0.0.110',
					port: 8085,
					refreshRate: refreshRate,
					refreshInterval: parseInt(1 / refreshRate * 1000),
				},
				rendering: {
					fps: 60,
					useNormalMaps: true,
					useSpecularMaps: true,
					showSkybox: true,
					showLensFlare: true,
					postProcessing: true,
				},
			},

			storage: storage,
			ws: null,
			wsConnected: false,

			settingsVisible: false,

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
		// Connect to Telemachus socket
		this.ws = new WS(`ws://${this.config.telemachus.host}:${this.config.telemachus.port}/datalink`)
		this.ws.addOpenHandler(() => {
			this.wsConnected = true

			// Subscribe to data from Telemachus
			this.ws.send({rate: this.config.telemachus.refreshInterval, '+': subscriptions})
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
		saveConfig() {
			this.storage.set('config', this.config)
		},
	},
}
