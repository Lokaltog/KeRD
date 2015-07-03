export var bodies = {
	_atmDensity: 1.2230948554874,

	Kerbin: {
		name: 'Kerbin',
		radius: 600000,
		rotPeriod: 21600,
		atmosphere: 70000,
		atmosphereScaleHeight: 5600,
		atmosphereColor: 0x0077cc,
		atmosphereOpacity: 0.15,
		info: {
			surfaceGravity: 9.81,
			escapeVelocity: 3431.03,
			soi: 84159286,
		},
		textures: {
			diffuse: require('../../../assets/img/maps/kerbin-diffuse.jpg'),
			specular: require('../../../assets/img/maps/kerbin-specular.png'),
			normal: require('../../../assets/img/maps/kerbin-normal.png'),
			biome: require('../../../assets/img/maps/kerbin-biome.jpg'),
		},
		attributes: {
			shininess: 30,
		},
	},
}

export var bodiesById = {
	1: bodies.Kerbin,
}
