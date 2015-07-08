

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	methods: {
		submit(ev) {
			ev.preventDefault()
			this.saveConfig()
			window.location.reload()
		},
		resetLayout(ev) {
			ev.preventDefault()
			this.storage.remove('layout')
			window.location.reload()
		},
		close() {
			this.settingsVisible = false
		},
	},
}
