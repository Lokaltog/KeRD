export default {
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['contents'],
	inherit: true,
}
