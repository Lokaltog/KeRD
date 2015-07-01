import $ from 'jquery'
import THREE from 'three'
import TWEEN from 'tween'
import {ll2cartesian, wrapDegDelta, debounce, deg2rad} from 'utils'
import {bodies} from 'resources/bodies'

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
			var $dim = $('.orbital-display').width()
			renderer.setSize($dim, $dim)
		}
		$(window).on('resize', debounce(resize))
		resize()

		// Create scene and setup camera and lights
		var scene = new THREE.Scene()
		var camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000)

		scene.add(new THREE.AmbientLight(0x666666))

		var light = new THREE.DirectionalLight(0xffffff, 2)
		light.position.set(5000, 0, 0)
		scene.add(light)

		// Init body geometry and materials
		var bodyGeometry = new THREE.SphereGeometry(this.displayRadius, 32, 32)
		var bodyMaterial = new THREE.MeshPhongMaterial({
			shininess: 30,
		})
		var bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)

		// Init vessel geometry
		var vesselGeometry = new THREE.SphereGeometry(2, 8, 8)
		var vesselMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
		var vesselMesh = new THREE.Mesh(vesselGeometry, vesselMaterial)

		// Init vessel line (to body center, indicating altitude)
		var lineGeometry = new THREE.Geometry()
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0x770000 })
		var line = new THREE.Line(lineGeometry, lineMaterial)

		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))
		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0))

		// Init orbit ellipse
		var orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 })
		var orbitPath = new THREE.CurvePath()
		orbitPath.add(new THREE.EllipseCurve(0, 0, 1, 1, 0, 2 * Math.PI, false))
		var orbitGeometry = orbitPath.createPointsGeometry(64)
		orbitGeometry.computeTangents()
		var orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)

		scene.add(bodyMesh)
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
		var trueAnomaly = 0
		var inclination = 0
		var argumentOfPeriapsis = 0

		var vesselTweenProperties
		var vesselTween

		this.$watch(() => this.data['v.long'] + this.data['v.lat'] + this.data['v.altitude'] + this.data['v.body'], () => {
			var body = bodies[this.data['v.body']]

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

			// FIXME Rotate body correctly in relation to Kerbol
			var epoch = this.data['o.epoch']
			bodyMesh.rotation.y = deg2rad(((epoch / body.rotPeriod) * 360))

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

			trueAnomaly = this.data['o.trueAnomaly']
			inclination = this.data['o.inclination']
			argumentOfPeriapsis = this.data['o.argumentOfPeriapsis']

			// Draw orbit ellipse
			// http://stackoverflow.com/questions/19432633/how-do-i-draw-an-ellipse-with-svg-based-around-a-focal-point-instead-of-the-cen
			var ratio = (this.displayRadius / body.radius)

			var aop = this.data['o.argumentOfPeriapsis']
			var incl = this.data['o.inclination']
			var sma = this.data['o.sma']
			var ecc = this.data['o.eccentricity']
			var lan = this.data['o.lan']

			var rx = ratio * sma
			var ry = ratio * (sma * (Math.sqrt(1 - Math.pow(ecc, 2))))
			var cx = Math.sqrt(Math.pow(rx, 2) - Math.pow(ry, 2))
			var cy = 0

			orbitPath = new THREE.CurvePath()
			orbitPath.add(new THREE.EllipseCurve(cx, cy, rx, ry, 0, 2 * Math.PI, false))
			orbitGeometry = orbitPath.createPointsGeometry(64)
			orbitGeometry.computeTangents()

			orbitLine.geometry.vertices = orbitGeometry.vertices
			orbitLine.geometry.verticesNeedUpdate = true

			vesselTween.onUpdate(() => {
				// Calculate orbital position
				var sin = Math.sin
				var cos = Math.cos

				var ta = deg2rad(vesselTweenProperties.trueAnomaly)
				var i = deg2rad(vesselTweenProperties.inclination)
				var w = deg2rad(vesselTweenProperties.argumentOfPeriapsis)
				var omega = deg2rad(lan)

				var r = ratio * sma * (1 - Math.pow(ecc, 2)) / (1 + ecc * cos(ta))
				var ta_w = ta + w
				var x = r * (cos(omega) * cos(ta_w) - sin(omega) * sin(ta_w) * cos(i))
				var y = r * (sin(omega) * cos(ta_w) + cos(omega) * sin(ta_w) * cos(i))
				var z = r * (sin(ta_w) * sin(i))

				vesselMesh.position.x = x
				vesselMesh.position.y = z
				vesselMesh.position.z = -y
				lineGeometry.vertices[1].x = x
				lineGeometry.vertices[1].y = z
				lineGeometry.vertices[1].z = -y
				lineGeometry.verticesNeedUpdate = true

				camera.lookAt(origo)
			})
			vesselTween.start()
		})

	},
}
