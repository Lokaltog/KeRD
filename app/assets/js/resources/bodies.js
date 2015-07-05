export default {
	_atmDensity: 1.2230948554874,

	Kerbin: {
		atmosphereScaleHeight: 5600,
		atmosphereColor: 0x0077cc,
		atmosphereOpacity: 0.15,
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
