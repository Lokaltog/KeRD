export var bodies = {
	Kerbin: {
		name: 'Kerbin',
		radius: 600000,
		atmosphere: 70000,
		rotPeriod: 21600,
		atmosphereColor: 0x0077cc,
		atmosphereOpacity: 0.2,
		textures: {
			diffuse: require('../../../assets/img/maps/kerbin-diffuse.jpg'),
			specular: require('../../../assets/img/maps/kerbin-specular.png'),
			normal: require('../../../assets/img/maps/kerbin-normal.png'),
		},
	},
}

export var bodiesById = {
	1: bodies.Kerbin,
}
