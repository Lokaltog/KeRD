// Include global styles (*only* globals in this stylesheet)
require('./main.sass')

import Vue from 'vue'
import $ from 'jquery'

new Vue(require('./app')).$mount('#app')

$(document).bind('touchmove', false)

require('fastclick').attach(document.body)

$('head').append(
	$('<link>').attr({
		rel: 'shortcut icon',
		href: '',
	}),
	$('<link>').attr({
		rel: 'apple-touch-icon',
		href: require('../assets/img/apple-touch-icon-precomposed.png'),
	})
)
