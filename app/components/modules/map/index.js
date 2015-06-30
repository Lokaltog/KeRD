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

		scene.add(bodyMesh)
		scene.add(vesselMesh)
		scene.add(line)

		// Animate callback
		var animate = () => {
			requestAnimationFrame(animate)

			TWEEN.update()

			renderer.render(scene, camera)
		}
		requestAnimationFrame(animate)

		// Tweening
		var lat = 0
		var lon = 0
		var alt = 0
		var latLongTweenProperties
		var latLongTween

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

			// Rotate body correctly in relation to Kerbol
			// I have no idea why this is offset by -45deg, but it works
			var epoch = this.data['o.epoch']
			bodyMesh.rotation.y = deg2rad(((epoch / body.rotPeriod) * 360) - 45)

			// Animate vessel and camera positions
			latLongTweenProperties = {
				lat: lat,
				lon: lon,
				alt: alt,
			}
			latLongTween = new TWEEN.Tween(latLongTweenProperties).to({
				// Add normalized delta values to current values
				lat: lat + wrapDegDelta(this.data['v.lat'] - lat),
				lon: lon + wrapDegDelta(this.data['v.long'] - lon),
				alt: alt + wrapDegDelta(this.data['v.altitude'] - alt),
			}, this.refreshInterval)

			lat = this.data['v.lat']
			lon = this.data['v.long']
			alt = this.data['v.altitude']

			latLongTween.onUpdate(() => {
				var lat = latLongTweenProperties.lat
				var lon = latLongTweenProperties.lon - 270 // Texture offset
				var alt = latLongTweenProperties.alt

				var cameraCoords = ll2cartesian(0, 0, 400)
				var vesselCoords = ll2cartesian(lat, lon, (this.displayRadius / body.radius) * (alt + body.radius))

				camera.position.x = cameraCoords.x
				camera.position.y = cameraCoords.y
				camera.position.z = cameraCoords.z

				camera.lookAt(origo)

				vesselMesh.position.x = vesselCoords.x
				vesselMesh.position.y = vesselCoords.y
				vesselMesh.position.z = vesselCoords.z

				lineGeometry.vertices[1].x = vesselCoords.x
				lineGeometry.vertices[1].y = vesselCoords.y
				lineGeometry.vertices[1].z = vesselCoords.z
				lineGeometry.verticesNeedUpdate = true
			})
			latLongTween.start()
		})

	},
}
