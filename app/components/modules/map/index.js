import $ from 'jquery'
import THREE from 'three'
import TWEEN from 'tween'
import {ll2cartesian} from 'utils'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	data() {
		return {
			lat: 0,
			long: 0,
			alt: 0,

			locX: 0,
			locY: 0,

			w: 500,
			h: 500,
			bodyRadius: 600000, // for Kerbin, will be dynamic when body info is stored
			displayRadius: 50,
		}
	},
	ready() {
		var bodyRatio = this.displayRadius / this.bodyRadius
		var origo = new THREE.Vector3(0, 0, 0)

		// Init three.js renderer
		var renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		})
		renderer.setSize(this.w, this.h)
		$('.threed').append(renderer.domElement)

		// Create scene and setup camera and lights
		var scene = new THREE.Scene()
		var camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000)

		scene.add(new THREE.AmbientLight(0x888888))

		var light = new THREE.DirectionalLight(0xffeecc, 1)
		light.position.set(0, 0, 500)
		scene.add(light)

		// Init body geometry and materials
		var bodyGeometry = new THREE.SphereGeometry(this.displayRadius, 32, 32)
		var bodyMaterial = new THREE.MeshPhongMaterial({
			map: THREE.ImageUtils.loadTexture(require('../../../assets/img/maps/kerbin-diffuse.jpg')),
			specularMap: THREE.ImageUtils.loadTexture(require('../../../assets/img/maps/kerbin-specular.png')),
			normalMap: THREE.ImageUtils.loadTexture(require('../../../assets/img/maps/kerbin-normal.png')),
			shininess: 50,
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

		this.$watch(() => this.data['v.long'] + this.data['v.lat'] + this.data['v.altitude'], () => {
			// Animate vessel and camera positions
			var lat = this.data['v.lat']
			var long = this.data['v.long'] - 270
			var alt = this.data['v.altitude']

			var latLongTweenCoords = {
				lat: this.lat,
				long: this.long,
				alt: this.alt,
			}

			this.lat = lat
			this.long = long
			this.alt = alt

			var latLongTween = new TWEEN.Tween(latLongTweenCoords).to({
				lat: lat,
				long: long,
				alt: alt,
			}, this.refreshInterval)

			latLongTween.onUpdate(() => {
				// Tween camera and vessel coords
				var cameraCoords = ll2cartesian(0, latLongTweenCoords.long, 400)
				var vesselCoords = ll2cartesian(latLongTweenCoords.lat, latLongTweenCoords.long, bodyRatio * (latLongTweenCoords.alt + this.bodyRadius))

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

			// Draw icon on map
			var map = $('.map', this.$el)
			var w = map.width()
			var h = map.height()
			var iconOffset = -$('.target', this.$el).width() / 2

			this.locX = ((w / 2) + ((long / 180) * (w / 2))) + iconOffset + 'px'
			this.locY = ((h / 2) - ((lat / 90) * (h / 2))) + iconOffset + 'px'
		})

	},
}
