import d3 from 'd3'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	ready() {
		this.$watch(() => this.data['v.altitude'] + this.data['o.PeA'] + this.data['o.ApA'], () => {
			var alt = this.data['v.altitude']
			var pe = this.data['o.PeA']
			var ap = this.data['o.ApA']

			// Don't draw negative values
			alt = (alt < 0 ? 0 : alt) || 0
			pe = (pe < 0 ? 0 : pe) || 0
			ap = (ap < 0 ? 0 : ap) || 0

			tick({
				alt: alt,
				pe: pe,
				ap: ap,
			})
		})

		var limit = 60 * 5
		var duration = this.refreshInterval - 100  // Add 100ms margin to account for lag
		var now = new Date(Date.now() - duration)

		var width = 600
		var height = 300

		var groups = {
			alt: {
				value: 0,
				color: '#fff',
				data: d3.range(limit).map(() => 0)
			},
			pe: {
				value: 0,
				color: '#555',
				data: d3.range(limit).map(() => 0)
			},
			ap: {
				value: 0,
				color: '#555',
				data: d3.range(limit).map(() => 0)
			}
		}

		var x = d3.time.scale()
			    .domain([now - (limit - 2) * 1000, now - 1000])
			    .range([0, width])

		var y = d3.scale.linear()
			    .domain([0, 100])
			    .range([height - 20, 0])

		var line = d3.svg.line()
			    .interpolate('monotone')
			    .x((d, i) => x(now - (limit - 1 - i) * 1000))
			    .y((d) => y(d))

		var svg = d3.select('.orbit-graph').append('svg')
			    .attr('viewBox', `0 0 ${width} ${height}`)
			    .attr('preserveAspectRatio', 'xMinYMin meet')
			    .attr('width', width)
			    .attr('height', height)

		var axis = svg.append('g')
			    .attr('class', 'x axis')
			    .attr('transform', `translate(0, ${height - 20})`)
			    .call(x.axis = d3.svg.axis().scale(x).orient('bottom'))

		var paths = svg.append('g')

		for (var key in groups) {
			if (groups.hasOwnProperty(key)) {
				var group = groups[key]
				group.path = paths.append('path')
					.data([group.data])
					.attr('class', name + ' group')
					.style('stroke', group.color)
			}
		}

		function tick(data) {
			var key
			now = new Date()

			for (key in groups) {
				if (groups.hasOwnProperty(key)) {
					// Add new values
					groups[key].data.push(data[key] || 0)
					groups[key].path.attr('d', line)
				}
			}

			x.domain([now - (limit - 2) * 1000, now - 1000])
			y.domain([0, d3.max(Object.keys(data).map((key) => data[key]))])

			// Slide x-axis left
			axis.transition()
				.duration(duration)
				.ease('linear')
				.call(x.axis)

			// Slide paths left
			paths.attr('transform', null)
				.transition()
				.duration(duration)
				.ease('linear')
				.attr('transform', `translate(${x(now - (limit - 1) * 1000)})`)

			for (key in groups) {
				if (groups.hasOwnProperty(key)) {
					groups[key].data.shift()
				}
			}
		}
	},
}
