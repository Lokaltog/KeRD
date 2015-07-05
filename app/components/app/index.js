import $ from 'jquery'
import numeral from 'numeral'
import WS from 'websocket'
import subscriptions from 'resources/subscriptions'
import LocalStorage from 'storage'

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
		return {
			config: $.extend(true, {
				telemachus: {
					host: 'localhost',
					port: 8085,
					refreshRate: 1,
					refreshInterval: 1000,
				},
				rendering: {
					fps: 60,
					normalMaps: true,
					specularMaps: true,
					shadows: false,
					skybox: true,
					lensFlare: true,
					postProcessing: true,
					textureQuality: 'lo',
				},
				modules: {
					map: {
						showBodyDetails: true,
					},
				},
			}, storage.get('config')),

			storage: storage,
			ws: null,
			wsConnected: false,

			settingsVisible: false,

			data: {},

			layout: [
				row(
					section(module('map')),
					section(module('resources')),
					col(
						sectionExpand(module('vessel')),
						section(module('navigation'))
					),
					col(
						section(module('orbit'))
					)
				)
			],

			resources: {
				_atmDensity: 1.2230948554874,
				bodies: require('../../assets/js/resources/bodies'),
			},
		}
	},
	ready() {
		this.$watch('config.telemachus.refreshRate', () => this.config.telemachus.refreshInterval = parseInt(1 / this.config.telemachus.refreshRate * 1000), { immediate: true })

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
			var bodyIndexMap = {}

			// Handle message data
			// msg is a simple key => value map
			Object.keys(msg).forEach(k => {
				// Check if we've received celestial body data
				if (k.indexOf('b.') === 0 && k !== 'b.number') {
					var m = k.match(/^(.*)\[(\d+)\]$/)
					var key = m[1]
					var idx = parseInt(m[2])

					// Group unordered data object by body ID
					if (!bodyIndexMap[idx]) {
						bodyIndexMap[idx] = {}
					}

					// Store celestial body info in temporary bodyIndex => data map
					bodyIndexMap[idx][key] = msg[k]
				}
				else {
					// Vessel/orbit data to be stored in vm.data
					if (!this.data[k]) {
						this.data.$add(k, null)
					}
					this.data[k] = msg[k]
				}
			})

			if (Object.keys(bodyIndexMap).length) {
				// Store properties in vm.resources.bodies data map
				Object.keys(bodyIndexMap).forEach(k => {
					var data = bodyIndexMap[k]
					if (typeof this.resources.bodies[data['b.name']] === 'undefined') {
						// We don't have textures or anything for this body so might as well skip it
						return
					}
					this.resources.bodies[data['b.name']].$add('data', {
						index: parseInt(k),
						atmosphereContainsOxygen: data['b.atmosphereContainsOxygen'].toLowerCase() === 'true',
						atmosphereHeight: data['b.maxAtmosphere'],
						name: data['b.name'],
						gravParameter: data['b.o.gravParameter'],
						period: data['b.o.period'],
						radius: data['b.radius'],
						rotPeriod: data['b.rotationPeriod'],
						soi: data['b.soi'],
						tidallyLocked: data['b.tidallyLocked'].toLowerCase() === 'true',
					})
				})
				// Let child VMs know that we've received and parsed the celestial body data
				this.$broadcast('resources.bodies.ready')
			}
		})
		this.ws.connect().fail(msg => console.error(msg))

		// Update celestial bodies
		this.$watch(() => this.data['b.number'], () => {
			// Request celestial body properties when the number of celestial bodies has changed
			var request = []
			for (var i = 1; i < this.data['b.number']; i += 1) {
				request = request.concat([
					`b.atmosphereContainsOxygen[${i}]`,
					`b.maxAtmosphere[${i}]`,
					`b.name[${i}]`,
					`b.o.gravParameter[${i}]`,
					`b.o.period[${i}]`,
					`b.radius[${i}]`,
					`b.rotationPeriod[${i}]`,
					`b.soi[${i}]`,
					`b.tidallyLocked[${i}]`,
				])
			}

			this.ws.send({run: request})
		})
		// Request number of celestial bodies
		this.ws.send({run: ['b.number']})
	},
	methods: {
		numeral: numeral,
		saveConfig() {
			this.storage.set('config', this.config)
		},
	},
}
