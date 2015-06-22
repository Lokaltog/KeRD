import Vue from 'vue'
import $ from 'jquery'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	data() {
		return {
			actions: {},
		}
	},
	ready() {
	},
	methods: {
		action(group) {
			if (typeof this.actions[group] === 'undefined') {
				this.actions.$add(group, false)
			}
			this.actions[group] = !this.actions[group]
		},
	},
}
