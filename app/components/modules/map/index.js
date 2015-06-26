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
		this.$watch(() => this.data['v.long'] + this.data['v.lat'], () => {
			var map = $('.map', this.$el)
			var w = map.width()
			var h = map.height()
			var iconOffset = -$('.target', this.$el).width() / 2
			this.locX = ((w / 2) + ((this.data['v.long'] / 180) * (w / 2))) + iconOffset + 'px'
			this.locY = ((h / 2) - ((this.data['v.lat'] / 90) * (h / 2))) + iconOffset + 'px'
		})
	},
}
