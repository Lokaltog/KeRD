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
				color: 'transparent',
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
	},
}
