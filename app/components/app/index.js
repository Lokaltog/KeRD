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
function wrapper(type, cls='') {
	return function(...contents) {
		return {
			type: type,
			contents: contents,
			cls: cls,
		}
	}
}
var row = wrapper('row')
var rowExpand = wrapper('row', 'expand')
var col = wrapper('col')
var colExpand = wrapper('col', 'expand')
var section = wrapper('section')
var sectionExpand = wrapper('section', 'expand')
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
		map: require('../modules/map'),
		navigation: require('../modules/navigation'),
		orbit: require('../modules/orbit'),
		resources: require('../modules/resources'),
		vessel: require('../modules/vessel'),
	},
	data() {
		var config = storage.get('config')
		var telemachusRefreshRate = config ? (config.telemachus.refreshRate || 1) : 1
		var telemachusRefreshInterval = parseInt(1 / telemachusRefreshRate * 1000)
		if (config) {
			config.telemachus.refreshInterval = telemachusRefreshInterval
		}

		return {
			config: config || {
				telemachus: {
					host: 'localhost',
					port: 8085,
					refreshRate: telemachusRefreshRate,
					refreshInterval: telemachusRefreshInterval,
				},
				rendering: {
					fps: 60,
					normalMaps: true,
					specularMaps: true,
					shadows: false,
					skybox: true,
					lensFlare: true,
					postProcessing: true,
				},
				modules: {
					map: {
						showBodyDetails: true,
					},
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
						section(module('map')),
						section(module('resources')),
						rowExpand(
							col(
								section(
									row(
										module('navigation'),
										module('orbit')
									)
								),
								rowExpand(
									section(module('vessel'))
								)
							)
						)
					)
				)
			],
		}
	},
	ready() {
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
