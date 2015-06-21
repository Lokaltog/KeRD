var info = require('./package.json')

var gulp = require('gulp')
var jade = require('gulp-jade')
var htmlmin = require('gulp-htmlmin')
var imagemin = require('gulp-imagemin')
var gutil = require('gulp-util')
var del = require('del')
var rename = require('gulp-rename')
var webpack = require('webpack')
var bs = require('browser-sync').create()
var watch = require('gulp-watch')
var webpackCompiler
var ExtractTextPlugin = require('extract-text-webpack-plugin')

var __components_src = __dirname + '/app/components/'
var __assets_src = __dirname + '/app/assets/'
var __assets_dest = __dirname + '/static/assets/'

// common config
var config = {
	jade: {
		pretty: false,
	},
	sass: {},
	htmlmin: {
		collapseBooleanAttributes: true,
		collapseWhitespace: true,
		removeAttributeQuotes: true,
		removeComments: true,
		removeEmptyAttributes: true,
		removeOptionalTags: true,
		removeRedundantAttributes: true,
		useShortDoctype: true,
		processScripts: ['text/x-template'],
	},
	resolveAliases: (function(map) {
		Object.keys(map).forEach(function(key) {
			map[key] = __assets_src + map[key] + '.js'
		})
		return map
	})({
		'api': '/js/lib/api',
		'cookie': '/js/lib/cookie',
		'websocket': '/js/lib/websocket',

		'd3': '/js/lib/ext/d3',
		'jquery': '/js/lib/ext/jquery',
		'moment': '/js/lib/ext/moment',
		'page': '/js/lib/ext/page',
		'vex.dialog': '/js/lib/ext/vex.dialog',
		'vex': '/js/lib/ext/vex',
		'vue': '/js/lib/ext/vue',
	})
}

gulp.task('clean', function(cb) {
	del([
		'./static/*',
	], cb)
})

gulp.task('webpack', function(callback) {
	webpackCompiler.run(function(err, stats) {
		if (err) {
			throw new gutil.PluginError('webpack', err)
		}

		config.jade.locals.MAIN_CSS_FILE = 'main.bundle.css?v=' + stats.hash
		config.jade.locals.MAIN_JS_FILE = 'main.bundle.js?v=' + stats.hash

		gutil.log('webpack', stats.toString({
			colors: true,
		}))

		callback(err)
	})
})

gulp.task('imagemin', ['webpack'], function() {
	return gulp.src('static/assets/img/**/*')
		.pipe(imagemin())
		.pipe(gulp.dest('static/assets/img/'))
})

gulp.task('entrypoint', ['webpack', 'imagemin'], function() {
	return gulp
		.src('./app/components/main.jade')
		.pipe(jade(config.jade))
		.pipe(htmlmin(config.htmlmin))
		.pipe(rename('index.html'))
		.pipe(gulp.dest(__dirname + '/static/'))
})

// handle dev/prod config
gulp.task('set-env-dev', function() {
	config.ENV = 'dev'

	config.css = {
		root: __assets_src,
		localIdentName: '[name]__[local]__[hash:base64:8]'
	}
	config.sass = {
		includePaths: [
			__assets_src + '/sass/',
		],
		indentedSyntax: 'sass',
	}
	config.jade.locals = {
		DEBUG: true,
	}
	config.webpack = {
		cache: true,
		debug: true,
		devtool: 'eval',
		entry: {
			main: [__components_src + '/main.js'],
		},
		output: {
			pathinfo: true,

			path: __assets_dest,
			filename: 'js/[name].bundle.js?v=[hash]',
			chunkFilename: '[id].chunk.js?v=[hash]',
			publicPath: '/assets/',
		},
		resolve: {
			alias: config.resolveAliases,
		},
		plugins: [
			new webpack.BannerPlugin(info.name + '\n' + info.version + ' [development build]'),
			new webpack.DefinePlugin({
				DEBUG: true,
				STRIPE_KEY: JSON.stringify('pk_test_h156pOuAzZbYyH5dpgt4CffQ'),
			}),
		],
		module: {
			loaders: [
				{ test: /\.sass/, loader: 'style!css?' + JSON.stringify(config.css) + '!autoprefixer?browsers=last 2 version!sass?' + JSON.stringify(config.sass) },
				{ test: /\.jade$/, exclude: [/components\/main.jade$/], loader: 'jade' },
				{ test: /img\/.*\.(jpg|png|gif|svg|ico)$/, loader: 'file?name=img/[sha512:hash:base64:6].[ext]?v=[hash:6]' },
				{ test: /defs\/.*\.json$/, loader: 'file?name=defs/[sha512:hash:base64:6].[ext]?v=[hash:6]' },
				{ test: /font\/.*\.(eot|woff2?|ttf|svg)[?#]?.*$/, loader: 'file?name=font/[sha512:hash:base64:6].[ext]?v=[hash:6]' },
				{ test: /\.js$/, exclude: [/node_modules/, /lib\/ext/], loader: 'babel' },
			],
		},
	}

	webpackCompiler = webpack(config.webpack)
})

gulp.task('set-env-prod', function() {
	config.ENV = 'prod'

	config.css = {
		root: __assets_src,
		localIdentName: '[hash:base64:8]'
	}
	config.sass = {
		includePaths: [
			__assets_src + '/sass/',
		],
		indentedSyntax: 'sass',
		omitSourceMapUrl: true,
		outputStyle: 'compressed',
	}
	config.jade.locals = {
		DEBUG: false,
	}
	config.webpack = {
		cache: false,
		debug: false,
		entry: {
			main: [__components_src + '/main.js'],
		},
		output: {
			path: __assets_dest,
			filename: 'js/[name].bundle.js?v=[hash]',
			chunkFilename: '[id].chunk.js?v=[hash]',
			publicPath: '/assets/',
		},
		resolve: {
			alias: config.resolveAliases,
		},
		plugins: [
			new webpack.BannerPlugin(info.name + '\n' + info.version + ' [production build]'),
			new webpack.DefinePlugin({
				DEBUG: true,
				STRIPE_KEY: JSON.stringify(''),
			}),
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.AggressiveMergingPlugin(),
			new webpack.optimize.UglifyJsPlugin()
		],
		module: {
			loaders: [
				{ test: /\.sass/, loader: 'style!css?' + JSON.stringify(config.css) + '!autoprefixer?browsers=last 2 version!sass?' + JSON.stringify(config.sass) },
				{ test: /\.jade$/, exclude: [/components\/main.jade$/], loader: 'jade' },
				{ test: /img\/.*\.(jpg|png|gif|svg|ico)$/, loader: 'file?name=img/[sha512:hash:base64:6].[ext]?v=[hash:6]' },
				{ test: /defs\/.*\.json$/, loader: 'file?name=defs/[sha512:hash:base64:6].[ext]?v=[hash:6]' },
				{ test: /font\/.*\.(eot|woff2?|ttf|svg)[?#]?.*$/, loader: 'file?name=font/[sha512:hash:base64:6].[ext]?v=[hash:6]' },
				{ test: /\.js$/, exclude: [/node_modules/, /lib\/ext/], loader: 'babel' },
			],
		},
	}

	webpackCompiler = webpack(config.webpack)
})

// main tasks
gulp.task('development', ['set-env-dev', 'entrypoint'], function() {
	bs.init({
		notify: false,
		port: 3000,
	})

	gulp.watch('app/components/**/*', ['entrypoint'])

	watch('static/**/*.css').pipe(bs.reload({stream: true}))
})

gulp.task('production', ['set-env-prod', 'entrypoint'])