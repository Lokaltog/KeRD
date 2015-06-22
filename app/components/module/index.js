import Vue from 'vue'
import $ from 'jquery'
import numeral from 'numeral'
import WS from 'websocket'

Vue.config.debug = DEBUG

export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['layout'],
	inherit: true,
	data() {
		return {
		}
	},
	ready() {
	},
	methods: {
	},
}
