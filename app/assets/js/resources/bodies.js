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
			lo: {
				diffuse: require('../../../assets/img/textures/bodies/kerbin/diffuse-1k.jpg'),
				specular: require('../../../assets/img/textures/bodies/kerbin/specular-1k.png'),
				normal: require('../../../assets/img/textures/bodies/kerbin/normal-512.png'),
				biome: require('../../../assets/img/textures/bodies/kerbin/biome-lo.jpg'),
			},
			hi: {
				diffuse: require('../../../assets/img/textures/bodies/kerbin/diffuse-2k.jpg'),
				specular: require('../../../assets/img/textures/bodies/kerbin/specular-2k.png'),
				normal: require('../../../assets/img/textures/bodies/kerbin/normal-1k.png'),
				biome: require('../../../assets/img/textures/bodies/kerbin/biome-hi.jpg'),
			},
		},
		attributes: {
			shininess: 30,
		},
	},
}

export var bodiesById = {
	1: bodies.Kerbin,
}
