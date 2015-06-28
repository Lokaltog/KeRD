import $ from 'jquery'
import THREE from 'three'
import TWEEN from 'tween'

function radians(deg) {
	return deg * Math.PI / 180
}

function latLongToCoords(lat, long, radius) {
	var phi = radians(90 - lat)
	var theta = radians(long + 180)

	return {
		x: -(radius * Math.sin(phi) * Math.cos(theta)),
		y: (radius * Math.cos(phi)),
		z: (radius * Math.sin(phi) * Math.sin(theta)),
	}
}

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['config'],
	data() {
		return {
			pitch: 0,
			roll: 0,
			heading: 0,
			w: 250,
			h: 250,
			displayRadius: 50,
		}
	},
	ready() {
		// Init three.js renderer
		var renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		})
		renderer.setSize(this.w, this.h)
		$('.navball').append(renderer.domElement)

		// Create scene and setup camera and lights
		var scene = new THREE.Scene()
		var camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000)
		camera.position.z = 200

		scene.add(new THREE.AmbientLight(0x888888))

		var light = new THREE.DirectionalLight(0xffffff, 1)
		light.position.set(500, 500, 500)
		scene.add(light)

		// Init body geometry and materials
		var navballGeometry = new THREE.SphereGeometry(this.displayRadius, 32, 32)
		var navballMaterial = new THREE.MeshPhongMaterial({
			map: THREE.ImageUtils.loadTexture(require('../../../assets/img/textures/navball.png')),
			shininess: 80,
		})
		var navballMesh = new THREE.Mesh(navballGeometry, navballMaterial)

		scene.add(navballMesh)

		// Animate callback
		var animate = () => {
			requestAnimationFrame(animate)

			TWEEN.update()

			renderer.render(scene, camera)
		}
		requestAnimationFrame(animate)

		this.$watch(() => this.data['n.pitch'] + this.data['n.roll'] + this.data['n.heading'], () => {
			var pitch = this.data['n.pitch']
			var roll = -this.data['n.roll']
			var heading = 270 - this.data['n.heading']

			var navballTweenProperties = {
				pitch: this.pitch,
				roll: this.roll,
				heading: this.heading,
			}

			this.pitch = pitch
			this.roll = roll
			this.heading = heading

			var navballTween = new TWEEN.Tween(navballTweenProperties).to({
				pitch: pitch,
				roll: roll,
				heading: heading,
			}, this.refreshInterval)

			navballTween.onUpdate(() => {
				navballMesh.rotation.order = 'ZXY'
				navballMesh.rotation.z = radians(navballTweenProperties.roll)
				navballMesh.rotation.x = radians(navballTweenProperties.pitch)
				navballMesh.rotation.y = radians(navballTweenProperties.heading)
			})
			navballTween.start()
		})
	},
}
