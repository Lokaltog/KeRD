import Vue from 'vue'
import $ from 'jquery'
import numeral from 'numeral'
import WS from 'websocket'

Vue.config.debug = DEBUG

export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	components: {
		module: require('../module'),

		actiongroups: require('../modules/actiongroups'),
		map: require('../modules/map'),
		orbit: require('../modules/orbit'),
	},
	data() {
		return {
			host: '127.0.0.1',
			port: 8085,
			refreshRate: 1,
			ws: null,
			wsConnected: false,

			data: {},

			layout: [
				{
					type: 'col',
					content: [
						{
							type: 'row',
							content: [
								{
									type: 'section',
									content: [
										{
											type: 'module',
											id: 'actiongroups',
											config: {},
										},
									],
								},
								{
									type: 'section',
									content: [
										{
											type: 'module',
											id: 'orbit',
											config: {},
										},
									],
								},
							],
						},
						{
							type: 'section',
							content: [
								{
									type: 'module',
									id: 'map',
									config: {},
								},
							],
						},
					],
				},
			],
		}
	},
	created() {
		this.ws = new WS(`ws://${this.host}:${this.port}/datalink`)

		this.ws.addMessageHandler(ev => {
			var msg = JSON.parse(ev.data)

			Object.keys(msg).forEach(k => {
				if (!this.data[k]) {
					this.data.$add(k, null)
				}
				this.data[k] = msg[k]
				this.$broadcast(k, msg[k])
			})
		})

		this.ws.addOpenHandler(() => this.wsConnected = true)
		this.ws.addCloseHandler(() => this.wsConnected = false)

		this.ws.connect().fail(msg => console.error(msg))

		// Subscribe to data from Telemachus
		this.ws.send({rate: parseInt(1 / this.refreshRate * 1000), '+': [
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
