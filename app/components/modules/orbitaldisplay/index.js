import $ from 'jquery'
import THREE from 'three'
import TWEEN from 'tween'
import {wrapDegDelta, debounce, deg2rad, spherical2cartesian, orbitalElements2Cartesian, objScreenPosition, angleZero2Pi} from 'utils'

require('imports?THREE=three!three.maskpass')
require('imports?THREE=three!three.copyshader')
require('imports?THREE=three!three.effectcomposer')
require('imports?THREE=three!three.renderpass')
require('imports?THREE=three!three.shaderpass')
require('babel!imports?THREE=three!three.crtshader')

var sin = Math.sin
var asin = Math.asin
var sqrt = Math.sqrt
var pow = Math.pow

class CelestialView {
	constructor(el, config) {
		this.el = el
		this.config = config
		this.objects = {}

		var origo = new THREE.Vector3(0, 0, 0)
		this.focusPosition = origo
		this.origo = origo

		// Set camera properties
		this.displayRadius = 50
		this.displayRatio = 0
		this.cameraRho = 200 // distance
		this.cameraPhi = 0 // initial horizontal angle
		this.cameraTheta = 90 // initial vertical angle
		this.cameraFov = 50
		this.cameraMargin = 220

		// Global tweening data
		this.argumentOfPeriapsis = 0
		this.eccentricity = 0
		this.epoch = 0
		this.inclination = 0
		this.longitudeOfAscendingNode = 0
		this.semimajorAxis = 0
		this.trueAnomaly = 0
		this.body = null
		this.vesselTweenProperties = null
		this.vesselTween = null

		// Add ap/pe arrow nodes
		this.apoapsisNode = $('<div>').addClass('apoapsis')
		this.periapsisNode = $('<div>').addClass('periapsis')
		this.el.append(
			$('<div>').addClass('nodes').append(
				this.apoapsisNode,
				this.periapsisNode
			)
		)

		// Setup scene
		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(this.cameraFov, 1, 0.01, 120000)

		this.scene.add(new THREE.AmbientLight(0x777777))

		// Init renderer
		this.renderer = new THREE.WebGLRenderer({
			alpha: true,
		})
		this.renderer.setSize(1, 1)
		this.el.append(this.renderer.domElement)

		this.renderer.shadowMapEnabled = true
		this.renderer.shadowMapType = THREE.PCFShadowMap
		this.renderer.setPixelRatio(window.devicePixelRatio)

		// Add sun light
		var sunPosition = new THREE.Vector3(0, 0, -40000)
		var sunLight = new THREE.DirectionalLight(0xffffff, 1)
		sunLight.position.copy(sunPosition)
		this.scene.add(sunLight)

		if (this.config.rendering.shadows) {
			var shadowLight = new THREE.SpotLight(0xffffff, 1, 1)
			shadowLight.position.copy(new THREE.Vector3(0, 0, -500))
			shadowLight.castShadow = true
			shadowLight.onlyShadow = true
			shadowLight.exponent = 0
			shadowLight.shadowDarkness = 0.5
			shadowLight.shadowCameraFar = 800
			shadowLight.shadowCameraFov = 40
			this.scene.add(shadowLight)
		}

		// Add celestial body
		var bodyGeometry = new THREE.SphereGeometry(this.displayRadius, 32, 32)
		var bodyMaterial = new THREE.MeshPhongMaterial()
		bodyMaterial.normalScale = new THREE.Vector2(1.5, 1.5)
		var bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
		bodyMesh.castShadow = true
		bodyMesh.receiveShadow = true
		this.scene.add(bodyMesh)
		this.objects.bodyMesh = bodyMesh

		// Add atmosphere indicator
		var atmosphereGeometry = new THREE.SphereGeometry(1, 32, 32)
		var atmosphereMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
		atmosphereMaterial.transparent = true
		atmosphereMaterial.opacity = 0
		var atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
		this.scene.add(atmosphereMesh)
		this.objects.atmosphereMesh = atmosphereMesh

		// Add vessel geometry
		var vesselGeometry = new THREE.SphereGeometry(2.5, 16, 16)
		var vesselMaterial = new THREE.MeshPhongMaterial({ color: 0x770000 })
		var vesselMesh = new THREE.Mesh(vesselGeometry, vesselMaterial)
		vesselMesh.castShadow = true
		vesselMesh.receiveShadow = true
		this.scene.add(vesselMesh)
		this.objects.vesselMesh = vesselMesh

		// Add apoapsis/periapsis geometry
		var apoapsisMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00aa00, visible: false }))
		var periapsisMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00aa00, visible: false }))
		this.scene.add(apoapsisMesh)
		this.scene.add(periapsisMesh)
		this.objects.apoapsisMesh = apoapsisMesh
		this.objects.periapsisMesh = periapsisMesh

		// Add vessel line (from body center, indicating altitude)
		var lineGeometry = new THREE.Geometry()
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
		var lineMesh = new THREE.Line(lineGeometry, lineMaterial)
		lineMesh.castShadow = true
		lineMesh.receiveShadow = true
		lineMesh.frustumCulled = false

		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))
		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))

		this.scene.add(lineMesh)
		this.objects.lineMesh = lineMesh
		this.objects.lineGeometry = lineGeometry

		// Add orbit ellipse
		var orbitLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
		var orbitLinePath = new THREE.CurvePath()
		orbitLinePath.add(new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false))
		var orbitLineGeometry = orbitLinePath.createPointsGeometry(256)
		orbitLineGeometry.computeTangents()
		var orbitLineMesh = new THREE.Line(orbitLineGeometry, orbitLineMaterial)
		orbitLineMesh.frustumCulled = false
		orbitLineMesh.rotation.order = 'YXZ'

		this.scene.add(orbitLineMesh)
		this.objects.orbitLineMesh = orbitLineMesh
		this.objects.orbitLinePath = orbitLinePath
		this.objects.orbitLineGeometry = orbitLineGeometry

		// Add optional lens flare
		if (this.config.rendering.lensFlare) {
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
			lensFlare.position.copy(sunLight.position)

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

			this.scene.add(lensFlare)
		}

		// Add optional skybox
		if (this.config.rendering.skybox) {
			var skyboxGeometry = new THREE.SphereGeometry(100000, 32, 32)
			var skyboxTextureRes = {
				hi: '1k',
				lo: '512',
			}[this.config.rendering.textureQuality]
			var skyboxMap = THREE.ImageUtils.loadTextureCube([
				require(`../../../assets/img/textures/skybox/posx-${skyboxTextureRes}.jpg`),
				require(`../../../assets/img/textures/skybox/negx-${skyboxTextureRes}.jpg`),
				require(`../../../assets/img/textures/skybox/negy-${skyboxTextureRes}.jpg`),
				require(`../../../assets/img/textures/skybox/posy-${skyboxTextureRes}.jpg`),
				require(`../../../assets/img/textures/skybox/posz-${skyboxTextureRes}.jpg`),
				require(`../../../assets/img/textures/skybox/negz-${skyboxTextureRes}.jpg`),
			])
			skyboxMap.format = THREE.RGBFormat
			var skyboxMaterial = new THREE.MeshBasicMaterial({
				envMap: skyboxMap,
			})
			skyboxMaterial.side = THREE.BackSide
			var skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial)

			this.scene.add(skyboxMesh)
		}

		// Optional post-processing
		if (this.config.rendering.postProcessing) {
			var postprocessClock = new THREE.Clock()
			this.composer = new THREE.EffectComposer(this.renderer)
			var copyPass = new THREE.ShaderPass(THREE.CopyShader)
			this.composer.addPass(new THREE.RenderPass(this.scene, this.camera))

			this.crtEffect = new THREE.ShaderPass(THREE.CRTShader)
			this.composer.addPass(this.crtEffect)
			this.crtEffect.uniforms.iResolution.value = new THREE.Vector3(500, 500, 0)

			this.composer.addPass(copyPass)
			copyPass.renderToScreen = true

			this.setLoading(true)
		}

		// Resize renderer when window is resized
		$(window).on('resize', debounce(() => this.resizeContainer()))
		this.resizeContainer()

		// Camera rotation handlers
		var dragging
		var dragOffsetX = 0
		var dragOffsetY = 0

		var dragMultiplier = 0.5 // drag degrees multiplier per px movement
		var zoomMultiplier = 40 // zoom distance multiplier per mouse scroll

		$(document).on('mouseup touchend', () => {
			dragging = false
		})
		$(this.renderer.domElement).on('mousedown touchstart', (ev) => {
			ev.preventDefault()
			dragging = true

			dragOffsetX = ev.pageX || ev.originalEvent.touches[0].pageX
			dragOffsetY = ev.pageY || ev.originalEvent.touches[0].pageY
		})
		$(this.renderer.domElement).on('mousemove touchmove', (ev) => {
			ev.preventDefault()

			if (!dragging) {
				return
			}

			var offsetX = ev.pageX || ev.originalEvent.touches[0].pageX
			var offsetY = ev.pageY || ev.originalEvent.touches[0].pageY

			this.cameraPhi += deg2rad((offsetX - dragOffsetX) * dragMultiplier)
			this.cameraTheta -= deg2rad((offsetY - dragOffsetY) * dragMultiplier)

			this.rotateCamera()

			dragOffsetX = offsetX
			dragOffsetY = offsetY
		})
		$(this.renderer.domElement).on('mousewheel', (ev) => {
			// TODO add pinch zoom handler
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

		this.rotateCamera()

		// Animate callback
		var animate = () => {
			setTimeout(() => {
				requestAnimationFrame(animate)
			}, 1000 / this.config.rendering.fps)

			TWEEN.update()

			if (this.config.rendering.postProcessing) {
				this.crtEffect.uniforms.iGlobalTime.value += postprocessClock.getDelta()
				this.composer.render()
			}
			else {
				this.renderer.render(this.scene, this.camera)
			}
		}
		requestAnimationFrame(animate)
	}
	refreshBodyMaterials(force=false) {
		var bodyMaterial = this.objects.bodyMesh.material
		var atmosphereMaterial = this.objects.atmosphereMesh.material
		var textures = this.body.textures[this.config.rendering.textureQuality]

		if (!bodyMaterial.map || (bodyMaterial.map.sourceFile !== textures.diffuse && !this.showBiome) || force) {
			// Show noise while loading diffuse map
			this.setLoading(true)

			// Update textures based on the current body
			// Only updates if the current texture source files differs from the current body
			bodyMaterial.map = THREE.ImageUtils.loadTexture(textures.diffuse, undefined, () => {
				this.setLoading(false)
			})
			bodyMaterial.map.anisotropy = this.renderer.getMaxAnisotropy()

			if (this.config.rendering.specularMaps && textures.specular) {
				bodyMaterial.specularMap = THREE.ImageUtils.loadTexture(textures.specular)
				bodyMaterial.specularMap.anisotropy = this.renderer.getMaxAnisotropy() / 2
				try {
					bodyMaterial.shininess = this.body.attributes.shininess
				}
				catch (e) {}
			}
			else {
				bodyMaterial.specularMap = undefined
				bodyMaterial.shininess = 0
			}

			if (this.config.rendering.normalMaps && textures.normal) {
				bodyMaterial.normalMap = THREE.ImageUtils.loadTexture(textures.normal)
				bodyMaterial.normalMap.anisotropy = this.renderer.getMaxAnisotropy() / 2
			}
			else {
				bodyMaterial.normalMap = undefined
			}

			bodyMaterial.needsUpdate = true

			// Update atmosphere appearance on the current body
			atmosphereMaterial.color.setHex(this.body.atmosphereColor)
			atmosphereMaterial.opacity = this.body.atmosphereOpacity
			atmosphereMaterial.colorsNeedUpdate = true
		}

		// Resize atmosphere mesh
		if (this.body.data.atmosphereHeight) {
			var scale = (this.body.data.radius + this.body.data.atmosphereHeight) * (this.displayRadius / this.body.data.radius)
			this.objects.atmosphereMesh.scale.x = scale
			this.objects.atmosphereMesh.scale.y = scale
			this.objects.atmosphereMesh.scale.z = scale
		}
	}
	rotateCamera(rho, phi, theta) {
		var coords = spherical2cartesian(rho || this.cameraRho, phi || this.cameraPhi, theta || this.cameraTheta)
		var apoapsis2DCoords
		var periapsis2DCoords

		this.camera.position.x = this.focusPosition.x + coords.x
		this.camera.position.y = this.focusPosition.y + coords.y
		this.camera.position.z = this.focusPosition.z + coords.z
		this.camera.lookAt(this.focusPosition)
		this.camera.updateMatrixWorld()

		if (this.loading) {
			apoapsis2DCoords = new THREE.Vector2(-100, -100)
			periapsis2DCoords = new THREE.Vector2(-100, -100)
		}
		else {
			apoapsis2DCoords = objScreenPosition(this.objects.apoapsisMesh, this.camera, this.renderer)
			periapsis2DCoords = objScreenPosition(this.objects.periapsisMesh, this.camera, this.renderer)
		}

		this.apoapsisNode.css({
			left: `${apoapsis2DCoords.x}px`,
			top: `${apoapsis2DCoords.y}px`,
		})
		this.periapsisNode.css({
			left: `${periapsis2DCoords.x}px`,
			top: `${periapsis2DCoords.y}px`,
		})
	}
	setFocus(focus) {
		if (focus === 'body') {
			this.focusPosition = this.origo
		}
		else if (focus === 'vessel') {
			this.focusPosition = this.objects.vesselMesh.position
		}
		this.rotateCamera()
	}
	setAtmosphereVisible(visible) {
		this.objects.atmosphereMesh.visible = visible
	}
	setBiomeVisible(visible) {
		var material = this.objects.bodyMesh.material

		if (visible) {
			// Fix texture offset present in all the biome maps
			var textures = this.body.textures[this.config.rendering.textureQuality]
			var biomeTexture = THREE.ImageUtils.loadTexture(textures.biome)
			biomeTexture.offset.x = -0.25
			biomeTexture.wrapS = THREE.RepeatWrapping

			material.map = biomeTexture
			material.shininess = 0
			material.specularMap = undefined
			material.normalMap = undefined
			material.needsUpdate = true
		}
		else {
			this.refreshBodyMaterials(true)
		}
	}
	setLoading(loading) {
		if (this.config.rendering.postProcessing) {
			this.crtEffect.uniforms.noise.value = loading
		}
	}
	setVesselVisible(visible) {
		this.objects.vesselMesh.visible = visible
		this.objects.lineMesh.visible = visible
		this.objects.orbitLineMesh.visible = visible

		// Hide ap/pe nodes
		if (visible) {
			this.apoapsisNode.show()
			this.periapsisNode.show()
		}
		else {
			this.apoapsisNode.hide()
			this.periapsisNode.hide()
		}

		this.setFocus(visible ? 'vessel' : 'body')
	}
	setBody(body) {
		this.body = body
		this.refreshBodyMaterials()
	}
	tween(body, trueAnomaly, inclination, argumentOfPeriapsis, eccentricity, epoch, longitudeOfAscendingNode, semimajorAxis, universalTime, initialRotation=0) {
		if (!body) {
			// Disable if body is missing or we're still waiting for data
			this.setLoading(true)
			return
		}

		if (!this.body) {
			this.body = body
			this.refreshBodyMaterials()
		}

		this.displayRatio = (this.displayRadius / body.data.radius)

		this.rotateCamera()

		// Animate vessel and camera positions
		this.vesselTweenProperties = {
			trueAnomaly: this.trueAnomaly,
			inclination: this.inclination,
			argumentOfPeriapsis: this.argumentOfPeriapsis,
		}
		this.vesselTween = new TWEEN.Tween(this.vesselTweenProperties).to({
			// Add normalized delta values to current values
			trueAnomaly: this.trueAnomaly + wrapDegDelta(trueAnomaly - this.trueAnomaly),
			inclination: this.inclination + wrapDegDelta(inclination - this.inclination),
			argumentOfPeriapsis: this.argumentOfPeriapsis + wrapDegDelta(argumentOfPeriapsis - this.argumentOfPeriapsis),
		}, this.config.telemachus.refreshInterval)

		this.argumentOfPeriapsis = argumentOfPeriapsis
		this.eccentricity = eccentricity
		this.epoch = epoch
		this.inclination = inclination
		this.longitudeOfAscendingNode = longitudeOfAscendingNode
		this.semimajorAxis = semimajorAxis
		this.trueAnomaly = trueAnomaly

		// Rotate body correctly in relation to Kerbol
		// This appears to work correctly even without further calculations
		var bodySpinRate = 2 * Math.PI / body.data.rotPeriod
		var rotInit = deg2rad(initialRotation)
		var spinAngle = angleZero2Pi(rotInit + bodySpinRate * universalTime)
		this.objects.bodyMesh.rotation.y = spinAngle

		// Draw orbit ellipse
		// http://stackoverflow.com/questions/19432633/how-do-i-draw-an-ellipse-with-svg-based-around-a-focal-point-instead-of-the-cen
		var rx = this.displayRatio * semimajorAxis
		var ry = this.displayRatio * (semimajorAxis * (sqrt(1 - pow(eccentricity, 2))))
		var cx = sqrt(pow(rx, 2) - pow(ry, 2))
		var cy = 0

		this.objects.orbitLinePath = new THREE.CurvePath()
		this.objects.orbitLinePath.add(new THREE.EllipseCurve(cx, cy, rx, ry, 0, 2 * Math.PI, false))
		this.objects.orbitLineGeometry = this.objects.orbitLinePath.createPointsGeometry(256)
		this.objects.orbitLineGeometry.computeTangents()

		this.objects.orbitLineMesh.geometry.vertices = this.objects.orbitLineGeometry.vertices
		this.objects.orbitLineMesh.geometry.verticesNeedUpdate = true

		this.objects.orbitLineMesh.rotation.y = deg2rad(longitudeOfAscendingNode)
		this.objects.orbitLineMesh.rotation.x = -deg2rad(90 - inclination)
		this.objects.orbitLineMesh.rotation.z = -asin(sin(deg2rad(argumentOfPeriapsis)))

		this.vesselTween.onUpdate(() => {
			// Calculate orbital position
			var apoapsisPosition = orbitalElements2Cartesian(this.displayRatio, 180, eccentricity, semimajorAxis, this.vesselTweenProperties.inclination, longitudeOfAscendingNode, this.vesselTweenProperties.argumentOfPeriapsis)
			var periapsisPosition = orbitalElements2Cartesian(this.displayRatio, 0, eccentricity, semimajorAxis, this.vesselTweenProperties.inclination, longitudeOfAscendingNode, this.vesselTweenProperties.argumentOfPeriapsis)

			this.objects.apoapsisMesh.position.x = apoapsisPosition.x
			this.objects.apoapsisMesh.position.y = apoapsisPosition.z
			this.objects.apoapsisMesh.position.z = -apoapsisPosition.y

			this.objects.periapsisMesh.position.x = periapsisPosition.x
			this.objects.periapsisMesh.position.y = periapsisPosition.z
			this.objects.periapsisMesh.position.z = -periapsisPosition.y

			// Update vessel position
			var vesselPosition = orbitalElements2Cartesian(
				this.displayRatio,
				this.vesselTweenProperties.trueAnomaly,
				eccentricity,
				semimajorAxis,
				this.vesselTweenProperties.inclination,
				longitudeOfAscendingNode,
				this.vesselTweenProperties.argumentOfPeriapsis)

			// NOTE: coordinates are swapped to match the game's coordinate system
			this.objects.vesselMesh.position.x = vesselPosition.x
			this.objects.vesselMesh.position.y = vesselPosition.z
			this.objects.vesselMesh.position.z = -vesselPosition.y

			// Update indicator line from center to vessel
			this.objects.lineGeometry.vertices[1].copy(this.objects.vesselMesh.position)
			this.objects.lineGeometry.verticesNeedUpdate = true

			// Update camera position when vessel position has changed
			this.rotateCamera()
		})
		this.vesselTween.start()
	}
	resizeContainer() {
		var container = this.el
		var w = container.width()
		var h = container.height()

		this.camera.aspect = w / h
		this.camera.updateProjectionMatrix()

		if (this.composer) {
			this.composer.setSize(w, h)
		}
		this.renderer.setSize(w, h)
	}
	setEnabled(enabled) {
		if (enabled) {
            $(this.renderer.domElement).show()
		}
		else {
            $(this.renderer.domElement).hide()
		}
	}
}

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		return {
			focus: 'vessel',
			atmosphereVisible: true,
			biomeVisible: false,

			loading: true,
			body: null,
		}
	},
	ready() {
		this.cv = new CelestialView($('.orbital-display', this.$el), this.config)
		this.cv.setFocus(this.focus)

		this.$watch('layoutEditable', () => {
			this.cv.setEnabled(!this.layoutEditable)
		})

		// Don't attach watch handlers until we've received celestial body data from Telemachus
		this.$once('resources.bodies.ready', () => this.$watch(() => this.data['v.long'] + this.data['v.lat'] + this.data['v.body'], () => {
			if (!this.body) {
				this.body = this.resources.bodies[this.data['v.body']]
			}

			this.cv.tween(
				this.resources.bodies[this.data['v.body']],
				this.data['o.trueAnomaly'],
				this.data['o.inclination'],
				this.data['o.argumentOfPeriapsis'],
				this.data['o.eccentricity'],
				this.data['o.epoch'],
				this.data['o.lan'],
				this.data['o.sma'],
				this.data['t.universalTime'],
				this.body.initialRotation
			)
		}, { immediate: true }))
	},
	methods: {
		setFocus(focus) {
			this.focus = focus
			this.cv.setFocus(this.focus)
		},
		toggleAtmosphere() {
			this.atmosphereVisible = !this.atmosphereVisible
			this.cv.setAtmosphereVisible(this.atmosphereVisible)
		},
		toggleBiome() {
			this.biomeVisible = !this.biomeVisible
			this.cv.setBiomeVisible(this.biomeVisible)
		},
		changeBody(dir) {
			var bodiesSorted = Object.keys(this.resources.bodies).sort((a, b) => {
				a = this.resources.bodies[a]
				b = this.resources.bodies[b]
				if (a.data.index > b.data.index) {
					return 1
				}
				if (a.data.index < b.data.index) {
					return -1
				}
				return 0
			})

			var newIdx = this.body.data.index + dir - 1
			var totalBodies = Object.keys(this.resources.bodies).length

			if (newIdx < 0) {
				newIdx = totalBodies - 1
			}
			if (newIdx > totalBodies - 1) {
				newIdx = 0
			}

			this.body = this.resources.bodies[bodiesSorted[newIdx]]
			this.setFocus(this.data['v.body'] === this.body.data.name ? 'vessel' : 'body')

			this.cv.setVesselVisible(this.data['v.body'] === this.body.data.name)
			this.cv.setBody(this.body)
			this.cv.setBiomeVisible(this.biomeVisible)
		},
	},
}
