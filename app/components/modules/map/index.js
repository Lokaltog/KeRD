import $ from 'jquery'
import THREE from 'three'
import TWEEN from 'tween'
import {wrapDegDelta, debounce, deg2rad, spherical2cartesian} from 'utils'
import {bodies} from 'resources/bodies'

var sin = Math.sin
var asin = Math.asin
var cos = Math.cos
var sqrt = Math.sqrt
var pow = Math.pow

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	data() {
		return {
			displayRadius: 50,
		}
	},
	ready() {
		var origo = new THREE.Vector3(0, 0, 0)

		// Init three.js renderer
		var renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
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
		var cameraRho = 400 // distance
		var cameraPhi = 0 // initial horizontal angle
		var cameraTheta = 90 // initial vertical angle

		function rotateCamera(rho, phi, theta) {
			var coords = spherical2cartesian(rho, phi, theta)
			camera.position.x = coords.x
			camera.position.y = coords.y
			camera.position.z = coords.z
			camera.lookAt(origo)
		}

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
			// TODO add buttons for lock X/lock Y
			ev.preventDefault()

			if (!dragging) {
				return
			}

			cameraPhi += deg2rad((ev.pageX - dragOffsetX) * dragMultiplier)
			cameraTheta -= deg2rad((ev.pageY - dragOffsetY) * dragMultiplier)

			rotateCamera(cameraRho, cameraPhi, cameraTheta)

			dragOffsetX = ev.pageX
			dragOffsetY = ev.pageY
		})

		// Create scene and setup camera and lights
		var scene = new THREE.Scene()
		var camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000)

		rotateCamera(cameraRho, cameraPhi, cameraTheta)

		scene.add(new THREE.AmbientLight(0x888888))

		var light = new THREE.DirectionalLight(0xffffff, 2)
		light.position.set(0, 0, -5000)
		scene.add(light)

		// Init body geometry and materials
		var bodyGeometry = new THREE.SphereGeometry(this.displayRadius, 32, 32)
		var bodyMaterial = new THREE.MeshPhongMaterial({
			shininess: 30,
		})
		var bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)

		// Init atmosphere indicator
		var atmosphereGeometry = new THREE.SphereGeometry(1, 32, 32)
		var atmosphereMaterial = new THREE.MeshLambertMaterial({ color: 0x0077cc })
		atmosphereMaterial.transparent = true
		atmosphereMaterial.opacity = 0.2
		var atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)

		// Init vessel geometry
		var vesselGeometry = new THREE.SphereGeometry(2.5, 16, 16)
		var vesselMaterial = new THREE.MeshPhongMaterial({ color: 0x770000 })
		var vesselMesh = new THREE.Mesh(vesselGeometry, vesselMaterial)

		// Init vessel line (to body center, indicating altitude)
		var lineGeometry = new THREE.Geometry()
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
		var line = new THREE.Line(lineGeometry, lineMaterial)

		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))
		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))

		// Init orbit ellipse
		var orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
		var orbitPath = new THREE.CurvePath()
		orbitPath.add(new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false))
		var orbitGeometry = orbitPath.createPointsGeometry(64)
		orbitGeometry.computeTangents()
		var orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
		orbitLine.rotation.order = 'YXZ'

		scene.add(bodyMesh)
		scene.add(atmosphereMesh)
		scene.add(vesselMesh)
		scene.add(line)
		scene.add(orbitLine)

		// Animate callback
		var animate = () => {
			requestAnimationFrame(animate)

			TWEEN.update()

			renderer.render(scene, camera)
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

		this.$watch(() => this.data['v.long'] + this.data['v.lat'] + this.data['v.altitude'] + this.data['v.body'], () => {
			body = bodies[this.data['v.body']]
			ratio = (this.displayRadius / body.radius)

			if (!bodyMaterial.map || bodyMaterial.map.sourceFile !== body.textures.diffuse) {
				// Update textures based on the current body
				// Only updates if the current texture source files differs from the current body
				bodyMaterial.map = THREE.ImageUtils.loadTexture(body.textures.diffuse)
				bodyMaterial.specularMap = THREE.ImageUtils.loadTexture(body.textures.specular)
				bodyMaterial.normalMap = THREE.ImageUtils.loadTexture(body.textures.normal)

				bodyMaterial.map.anisotropy = renderer.getMaxAnisotropy()
				bodyMaterial.normalMap.anisotropy = renderer.getMaxAnisotropy() / 2
				bodyMaterial.specularMap.anisotropy = renderer.getMaxAnisotropy() / 2

				bodyMaterial.needsUpdate = true
			}

			// Resize atmosphere mesh
			if (body.atmosphere) {
				var scale = (body.radius + body.atmosphere) * ratio
				atmosphereMesh.scale.x = scale
				atmosphereMesh.scale.y = scale
				atmosphereMesh.scale.z = scale
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
			}, this.refreshInterval)

			argumentOfPeriapsis = this.data['o.argumentOfPeriapsis']
			eccentricity = this.data['o.eccentricity']
			epoch = this.data['o.epoch']
			inclination = this.data['o.inclination']
			longitudeOfAscendingNode = this.data['o.lan']
			semimajorAxis = this.data['o.sma']
			trueAnomaly = this.data['o.trueAnomaly']

			// FIXME Rotate body correctly in relation to Kerbol
			bodyMesh.rotation.y = deg2rad(((epoch / body.rotPeriod) * 360))

			// Draw orbit ellipse
			// http://stackoverflow.com/questions/19432633/how-do-i-draw-an-ellipse-with-svg-based-around-a-focal-point-instead-of-the-cen
			var rx = ratio * semimajorAxis
			var ry = ratio * (semimajorAxis * (sqrt(1 - pow(eccentricity, 2))))
			var cx = sqrt(pow(rx, 2) - pow(ry, 2))
			var cy = 0

			orbitPath = new THREE.CurvePath()
			orbitPath.add(new THREE.EllipseCurve(cx, cy, rx, ry, 0, 2 * Math.PI, false))
			orbitGeometry = orbitPath.createPointsGeometry(64)
			orbitGeometry.computeTangents()

			orbitLine.geometry.vertices = orbitGeometry.vertices
			orbitLine.geometry.verticesNeedUpdate = true

			orbitLine.rotation.y = deg2rad(longitudeOfAscendingNode)
			orbitLine.rotation.x = -deg2rad(90 - inclination)
			orbitLine.rotation.z = -asin(sin(deg2rad(argumentOfPeriapsis)))

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

				vesselMesh.position.x = x
				vesselMesh.position.y = z
				vesselMesh.position.z = -y

				// Update line from center
				lineGeometry.vertices[1].x = x
				lineGeometry.vertices[1].y = z
				lineGeometry.vertices[1].z = -y
				lineGeometry.verticesNeedUpdate = true
			})
			vesselTween.start()
		})

	},
}
