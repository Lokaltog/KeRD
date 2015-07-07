import $ from 'jquery'

var defaultLayout = JSON.parse('[{"flow":"row","style":"plain","module":null,"moduleConfig":{},"title":null,"expand":true,"contents":[{"flow":"row","style":"plain","module":null,"moduleConfig":{},"title":null,"expand":true,"contents":[{"flow":"row","style":"panel-dark","module":"orbitaldisplay","moduleConfig":{},"title":null,"expand":true,"contents":[]},{"flow":"row","style":"panel","module":"resources","moduleConfig":{},"title":"Resources","expand":false,"contents":[]},{"flow":"column","style":"plain","module":null,"moduleConfig":{},"title":null,"expand":false,"contents":[{"flow":"row","style":"panel","module":"vessel","moduleConfig":{},"title":"Vessel","expand":true,"contents":[]},{"flow":"row","style":"panel","module":"navigation","moduleConfig":{},"title":null,"expand":false,"contents":[]}]},{"flow":"column","style":"plain","module":"","moduleConfig":{},"title":null,"expand":true,"contents":[{"flow":"row","style":"panel","module":"orbitalinfo","moduleConfig":{},"title":"Orbit","expand":false,"contents":[]}]}]}]}]')

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['contents', 'root', 'parent-flow', 'title', 'editable'],
	data() {
		return {
			contents: [],
		}
	},
	ready() {
		if (!this.contents.length && this.root) {
			// Make sure we have at least one content block at root node
			this.addContents(this.contents)
		}

		if (this.root) {
			var existingLayout = this.storage.get('layout')
			if (existingLayout) {
				this.contents = existingLayout
			}
			else {
				this.contents = defaultLayout
			}
			this.$watch('contents', () => {
				this.storage.set('layout', this.contents)
			}, { deep: true })
		}
	},
	methods: {
		addContents(container) {
			container.push({
				flow: 'row',
				style: 'plain',
				module: null,
				moduleConfig: {},
				title: null,
				expand: true,
				contents: [],
			})
		},
		moveUp(item, by=1) {
			var index = this.contents.indexOf(item)
			var newPos = index - by

			if (index === -1) {
				throw 'Element not found in array'
			}
			if (newPos < 0) {
				newPos = 0
			}

			this.contents.splice(index, 1)
			this.contents.splice(newPos, 0, item)
		},
		moveDown(item, by=1) {
			var index = this.contents.indexOf(item)
			var newPos = index + by

			if (index === -1) {
				throw 'Element not found in array'
			}
			if (newPos >= this.length) {
				newPos = this.length
			}

			this.contents.splice(index, 1)
			this.contents.splice(newPos, 0, item)
		},
		componentExists(component) {
			return component in this.$root.$options.components
		},
		showControls(ev) {
			var target = $(ev.target)
			target.toggleClass('hover', true)
			$(document).on('click mousemove touchstart', (ev) => {
				if (!$(ev.target).closest('.controls-wrap').length) {
					target.toggleClass('hover', false)
					$(this).off(ev)
				}
			})
		},
	},
}
