import $ from 'jquery'
import THREE from 'three'
import TWEEN from 'tween'
import {wrapDegDelta, debounce, deg2rad, spherical2cartesian} from 'utils'
import {bodies} from 'resources/bodies'

require('imports?THREE=three!three.maskpass')
require('imports?THREE=three!three.copyshader')
require('imports?THREE=three!three.effectcomposer')
require('imports?THREE=three!three.renderpass')
require('imports?THREE=three!three.shaderpass')
require('babel!imports?THREE=three!three.crtshader')

var sin = Math.sin
var asin = Math.asin
var cos = Math.cos
var sqrt = Math.sqrt
var pow = Math.pow

var scene
var camera

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		var origo = new THREE.Vector3(0, 0, 0)
		return {
			// Camera properties
			displayRadius: 50,
			cameraRho: 200, // distance
			cameraPhi: 0, // initial horizontal angle
			cameraTheta: 90, // initial vertical angle
			cameraFov: 50,
			cameraMargin: 220,

			focus: null,
			showAtmosphere: true,

			objects: {},
			focusPosition: origo,
			origo: origo
		}
	},
	ready() {
		// Init three.js renderer
		var renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
		})
		renderer.setSize(1, 1)
		$('.orbital-display').append(renderer.domElement)

		// Resize renderer when window is resized
		function resize() {
			var $dim = $('.mod-map .content').width()
			renderer.setSize($dim, $dim)
			$('.mod-map .orbital-display').css({
				width: `${$dim}px`,
				height: `${$dim}px`,
			})
		}
		$(window).on('resize', debounce(resize))
		resize()

		// Camera rotation handlers
		var dragging
		var dragOffsetX = 0
		var dragOffsetY = 0

		var dragMultiplier = 0.5 // drag degrees multiplier per px movement
		var zoomMultiplier = 40 // zoom distance multiplier per mouse scroll

		$(document).on('mouseup', () => {
			dragging = false
		})
		$(renderer.domElement).on('mousedown', (ev) => {
			ev.preventDefault()
			dragging = true

			dragOffsetX = ev.pageX
			dragOffsetY = ev.pageY
		})
		$(renderer.domElement).on('mousemove', (ev) => {
			ev.preventDefault()

			if (!dragging) {
				return
			}

			this.cameraPhi += deg2rad((ev.pageX - dragOffsetX) * dragMultiplier)
			this.cameraTheta -= deg2rad((ev.pageY - dragOffsetY) * dragMultiplier)

			this.rotateCamera()

			dragOffsetX = ev.pageX
			dragOffsetY = ev.pageY
		})
		$(renderer.domElement).on('mousewheel', (ev) => {
			ev.preventDefault()
			var delta = ev.originalEvent.wheelDelta / 120
			delta = delta >= 1 ? 1 : -1
			var rho = -delta * zoomMultiplier

			this.cameraRho += rho
			if (this.cameraRho < 20) {
				this.cameraRho = 20
			}
			if (this.cameraRho > 800) {
				this.cameraRho = 800
			}

			this.rotateCamera()
		})

		// Create scene and setup camera and lights
		scene = new THREE.Scene()
		camera = new THREE.PerspectiveCamera(this.cameraFov, 1, 0.01, 120000)

		scene.add(new THREE.AmbientLight(0x888888))

		// Add sun light
		var sunPosition = new THREE.Vector3(0, 0, -5000)
		var light = new THREE.DirectionalLight(0xffffff, 2)
		light.position.copy(sunPosition)
		scene.add(light)

		// Add celestial body
		var bodyGeometry = new THREE.SphereGeometry(this.displayRadius, 32, 32)
		var bodyMaterial = new THREE.MeshPhongMaterial({
			shininess: 30,
		})
		var bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
		scene.add(bodyMesh)

		// Add atmosphere indicator
		var atmosphereGeometry = new THREE.SphereGeometry(1, 32, 32)
		var atmosphereMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
		atmosphereMaterial.transparent = true
		atmosphereMaterial.opacity = 0
		this.objects.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
		scene.add(this.objects.atmosphereMesh)

		// Add vessel geometry
		var vesselGeometry = new THREE.SphereGeometry(2.5, 16, 16)
		var vesselMaterial = new THREE.MeshPhongMaterial({ color: 0x770000 })
		this.objects.vesselMesh = new THREE.Mesh(vesselGeometry, vesselMaterial)
		scene.add(this.objects.vesselMesh)

		// Add vessel line (from body center, indicating altitude)
		var lineGeometry = new THREE.Geometry()
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
		var lineMesh = new THREE.Line(lineGeometry, lineMaterial)
		lineMesh.frustumCulled = false

		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))
		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))

		scene.add(lineMesh)

		// Add orbit ellipse
		var orbitLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
		var orbitLinePath = new THREE.CurvePath()
		orbitLinePath.add(new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false))
		var orbitLineGeometry = orbitLinePath.createPointsGeometry(256)
		orbitLineGeometry.computeTangents()
		var orbitLineMesh = new THREE.Line(orbitLineGeometry, orbitLineMaterial)
		orbitLineMesh.frustumCulled = false
		orbitLineMesh.rotation.order = 'YXZ'

		scene.add(orbitLineMesh)

		// Add optional lens flare
		if (this.config.rendering.showLensFlare) {
			var lensFlareTexture0 = THREE.ImageUtils.loadTexture(require('../../../assets/img/textures/lensflare/lensflare0.png'))
			var lensFlareTexture2 = THREE.ImageUtils.loadTexture(require('../../../assets/img/textures/lensflare/lensflare2.png'))
			var lensFlareTexture3 = THREE.ImageUtils.loadTexture(require('../../../assets/img/textures/lensflare/lensflare3.png'))

			var lensFlare = new THREE.LensFlare(lensFlareTexture0, 400, 0.0, THREE.AdditiveBlending, new THREE.Color(0xffffff))

			lensFlare.add(lensFlareTexture2, 512, 0.0, THREE.AdditiveBlending)
			lensFlare.add(lensFlareTexture2, 512, 0.0, THREE.AdditiveBlending)
			lensFlare.add(lensFlareTexture2, 512, 0.0, THREE.AdditiveBlending)
			lensFlare.add(lensFlareTexture3, 60, 0.6, THREE.AdditiveBlending)
			lensFlare.add(lensFlareTexture3, 70, 0.7, THREE.AdditiveBlending)
			lensFlare.add(lensFlareTexture3, 120, 0.9, THREE.AdditiveBlending)
			lensFlare.add(lensFlareTexture3, 70, 1.0, THREE.AdditiveBlending)
			lensFlare.position.copy(light.position)

			lensFlare.customUpdateCallback = function(object) {
				var flare
				var vecX = -object.positionScreen.x * 2
				var vecY = -object.positionScreen.y * 2

				for (var f = 0; f < object.lensFlares.length; f += 1) {
					flare = object.lensFlares[ f ]

					flare.x = object.positionScreen.x + vecX * flare.distance
					flare.y = object.positionScreen.y + vecY * flare.distance

					flare.rotation = 0
				}

				object.lensFlares[ 2 ].y += 0.025
				object.lensFlares[ 3 ].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad( 45 )
			}

			scene.add(lensFlare)
		}

		// Add optional skybox
		if (this.config.rendering.showSkybox) {
			var skyboxGeometry = new THREE.SphereGeometry(100000, 32, 32)
			var skyboxMap = THREE.ImageUtils.loadTextureCube([
				require('../../../assets/img/textures/skybox/posx.jpg'),
				require('../../../assets/img/textures/skybox/negx.jpg'),
				require('../../../assets/img/textures/skybox/posy.jpg'),
				require('../../../assets/img/textures/skybox/negy.jpg'),
				require('../../../assets/img/textures/skybox/posz.jpg'),
				require('../../../assets/img/textures/skybox/negz.jpg'),
			])
			skyboxMap.format = THREE.RGBFormat
			var skyboxMaterial = new THREE.MeshBasicMaterial({
				envMap: skyboxMap,
			})
			skyboxMaterial.side = THREE.BackSide
			var skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial)

			scene.add(skyboxMesh)
		}

		this.rotateCamera()

		// Optional post-processing
		if (this.config.rendering.postProcessing) {
			var postprocessClock = new THREE.Clock()
			var composer = new THREE.EffectComposer(renderer)
			var copyPass = new THREE.ShaderPass(THREE.CopyShader)
			composer.addPass(new THREE.RenderPass(scene, camera))

			var crtEffect = new THREE.ShaderPass(THREE.CRTShader)
			composer.addPass(crtEffect)
			crtEffect.uniforms.iResolution.value = new THREE.Vector3(500, 500, 0)

			composer.addPass(copyPass)
			copyPass.renderToScreen = true
		}

		// Animate callback
		var animate = () => {
			setTimeout(() => {
				requestAnimationFrame(animate)
			}, 1000 / this.config.rendering.fps)

			TWEEN.update()

			if (this.config.rendering.postProcessing) {
				crtEffect.uniforms.iGlobalTime.value += postprocessClock.getDelta()
				composer.render()
			}
			else {
				renderer.render(scene, camera)
			}
		}
		requestAnimationFrame(animate)

		// Tweening
		var argumentOfPeriapsis = 0
		var eccentricity = 0
		var epoch = 0
		var inclination = 0
		var longitudeOfAscendingNode = 0
		var semimajorAxis = 0
		var trueAnomaly = 0

		var body = {}
		var ratio = 0

		var vesselTweenProperties
		var vesselTween

		this.toggleFocus('vessel')

		this.$watch(() => this.data['v.long'] + this.data['v.lat'] + this.data['o.ApA'] + this.data['v.body'], () => {
			body = bodies[this.data['v.body']]
			ratio = (this.displayRadius / body.radius)

			this.rotateCamera()

			if (!bodyMaterial.map || bodyMaterial.map.sourceFile !== body.textures.diffuse) {
				// Update textures based on the current body
				// Only updates if the current texture source files differs from the current body
				bodyMaterial.map = THREE.ImageUtils.loadTexture(body.textures.diffuse)
				bodyMaterial.map.anisotropy = renderer.getMaxAnisotropy()

				if (this.config.rendering.useSpecularMaps) {
					bodyMaterial.specularMap = THREE.ImageUtils.loadTexture(body.textures.specular)
					bodyMaterial.specularMap.anisotropy = renderer.getMaxAnisotropy() / 2
				}
				if (this.config.rendering.useNormalMaps) {
					bodyMaterial.normalMap = THREE.ImageUtils.loadTexture(body.textures.normal)
					bodyMaterial.normalMap.anisotropy = renderer.getMaxAnisotropy() / 2
				}

				bodyMaterial.needsUpdate = true

				// Update atmosphere appearance on the current body
				atmosphereMaterial.color.setHex(body.atmosphereColor)
				atmosphereMaterial.opacity = body.atmosphereOpacity
				atmosphereMaterial.colorsNeedUpdate = true
			}

			// Resize atmosphere mesh
			if (body.atmosphere) {
				var scale = (body.radius + body.atmosphere) * ratio
				this.objects.atmosphereMesh.scale.x = scale
				this.objects.atmosphereMesh.scale.y = scale
				this.objects.atmosphereMesh.scale.z = scale
			}

			// Animate vessel and camera positions
			vesselTweenProperties = {
				trueAnomaly: trueAnomaly,
				inclination: inclination,
				argumentOfPeriapsis: argumentOfPeriapsis,
			}
			vesselTween = new TWEEN.Tween(vesselTweenProperties).to({
				// Add normalized delta values to current values
				trueAnomaly: trueAnomaly + wrapDegDelta(this.data['o.trueAnomaly'] - trueAnomaly),
				inclination: inclination + wrapDegDelta(this.data['o.inclination'] - inclination),
				argumentOfPeriapsis: argumentOfPeriapsis + wrapDegDelta(this.data['o.argumentOfPeriapsis'] - argumentOfPeriapsis),
			}, this.config.telemachus.refreshInterval)

			argumentOfPeriapsis = this.data['o.argumentOfPeriapsis']
			eccentricity = this.data['o.eccentricity']
			epoch = this.data['o.epoch']
			inclination = this.data['o.inclination']
			longitudeOfAscendingNode = this.data['o.lan']
			semimajorAxis = this.data['o.sma']
			trueAnomaly = this.data['o.trueAnomaly']

			// Rotate body correctly in relation to Kerbol
			// This appears to work correctly even without further calculations
			bodyMesh.rotation.y = deg2rad(((epoch / body.rotPeriod) * 360))

			// Draw orbit ellipse
			// http://stackoverflow.com/questions/19432633/how-do-i-draw-an-ellipse-with-svg-based-around-a-focal-point-instead-of-the-cen
			var rx = ratio * semimajorAxis
			var ry = ratio * (semimajorAxis * (sqrt(1 - pow(eccentricity, 2))))
			var cx = sqrt(pow(rx, 2) - pow(ry, 2))
			var cy = 0

			orbitLinePath = new THREE.CurvePath()
			orbitLinePath.add(new THREE.EllipseCurve(cx, cy, rx, ry, 0, 2 * Math.PI, false))
			orbitLineGeometry = orbitLinePath.createPointsGeometry(256)
			orbitLineGeometry.computeTangents()

			orbitLineMesh.geometry.vertices = orbitLineGeometry.vertices
			orbitLineMesh.geometry.verticesNeedUpdate = true

			orbitLineMesh.rotation.y = deg2rad(longitudeOfAscendingNode)
			orbitLineMesh.rotation.x = -deg2rad(90 - inclination)
			orbitLineMesh.rotation.z = -asin(sin(deg2rad(argumentOfPeriapsis)))

			vesselTween.onUpdate(() => {
				// Calculate orbital position
				var ta = deg2rad(vesselTweenProperties.trueAnomaly)
				var i = deg2rad(vesselTweenProperties.inclination)
				var w = deg2rad(vesselTweenProperties.argumentOfPeriapsis)
				var omega = deg2rad(longitudeOfAscendingNode)

				// Update vessel position
				var r = ratio * semimajorAxis * (1 - pow(eccentricity, 2)) / (1 + eccentricity * cos(ta))
				var ta_w = ta + w
				var x = r * (cos(omega) * cos(ta_w) - sin(omega) * sin(ta_w) * cos(i))
				var y = r * (sin(omega) * cos(ta_w) + cos(omega) * sin(ta_w) * cos(i))
				var z = r * (sin(ta_w) * sin(i))

				this.objects.vesselMesh.position.x = x
				this.objects.vesselMesh.position.y = z
				this.objects.vesselMesh.position.z = -y

				// Update line from center
				lineGeometry.vertices[1].x = x
				lineGeometry.vertices[1].y = z
				lineGeometry.vertices[1].z = -y
				lineGeometry.verticesNeedUpdate = true
			})
			vesselTween.start()
		})
	},
	methods: {
		rotateCamera(rho, phi, theta) {
			var coords = spherical2cartesian(rho || this.cameraRho, phi || this.cameraPhi, theta || this.cameraTheta)
			camera.position.x = this.focusPosition.x + coords.x
			camera.position.y = this.focusPosition.y + coords.y
			camera.position.z = this.focusPosition.z + coords.z
			camera.lookAt(this.focusPosition)
		},
		toggleFocus() {
			if (this.focus === 'vessel') {
				this.focus = 'body'
				this.focusPosition = this.origo
			}
			else {
				this.focus = 'vessel'
				this.focusPosition = this.objects.vesselMesh.position
			}
			this.rotateCamera()
		},
		toggleAtmosphere() {
			this.showAtmosphere = !this.showAtmosphere
			this.objects.atmosphereMesh.visible = this.showAtmosphere
		},
	},
}
