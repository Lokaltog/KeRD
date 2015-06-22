import Vue from 'vue'
import $ from 'jquery'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	data() {
		return {
		}
	},
	ready() {
	},
}
