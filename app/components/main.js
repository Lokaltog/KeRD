// Include global styles (*only* globals in this stylesheet)
require('./main.sass')

import Vue from 'vue'
import $ from 'jquery'

new Vue(require('./app')).$mount('#app')

$('head').append(
	$('<link>').attr({
		rel: 'shortcut icon',
		href: '',
	})
)
