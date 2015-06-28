export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['content'],
	inherit: true,
}
