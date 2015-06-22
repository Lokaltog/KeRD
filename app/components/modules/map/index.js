import Vue from 'vue'
import $ from 'jquery'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	data() {
		return {
			locX: 0,
			locY: 0,
		}
	},
	ready() {
		this.$on('v.long', (val) => {
			var w = $('.map', this.$el).width()
			var iconOffset = -$('.target', this.$el).width() / 2
			this.locX = ((w / 2) + ((val / 180) * (w / 2))) + iconOffset + 'px'
		})
		this.$on('v.lat', (val) => {
			var h = $('.map', this.$el).height()
			var iconOffset = -$('.target', this.$el).height() / 2
			this.locY = ((h / 2) - ((val / 90) * (h / 2))) + iconOffset + 'px'
		})
	},
}
