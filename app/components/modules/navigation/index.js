import $ from 'jquery'
import Vue from 'vue'
import THREE from 'three'
import TWEEN from 'tween'
import {deg2rad, wrapDegDelta, debounce} from 'utils'

export default {
	inherit: true,
	template: require('./template.jade')({styles: require('./stylesheet.sass')}),
	props: ['module-config'],
	data() {
		return {
			displayRadius: 50,
		}
	},
	ready() {
		// Init three.js renderer
		var renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		})
		renderer.setSize(1, 1)
		$('.navball', this.$el).append(renderer.domElement)

		// Resize renderer when window is resized
		function resize() {
			var $dim = $('.mod-navigation .navball').width()
			$('.mod-navigation .navball').css('height', $dim)
			renderer.setSize($dim, $dim)
		}
		$(window).on('resize', debounce(resize))
		resize()

		// Create scene and setup camera and lights
		var scene = new THREE.Scene()
		var camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000)
		camera.position.z = 190

		scene.add(new THREE.AmbientLight(0xaaaaaa))

		var light1 = new THREE.DirectionalLight(0xffffff, 1)
		light1.position.set(1500, 1500, 500)

		var light2 = new THREE.DirectionalLight(0xffffff, 0.5)
		light2.position.set(-1500, -1500, 500)

		scene.add(light1)
		scene.add(light2)

		// Init body geometry and materials
		var navballGeometry = new THREE.SphereGeometry(this.displayRadius, 48, 48)
		var navballTexture = THREE.ImageUtils.loadTexture(require('../../../assets/img/textures/navball.png'))
		navballTexture.anisotropy = renderer.getMaxAnisotropy()
		var navballMaterial = new THREE.MeshPhongMaterial({
			map: navballTexture,
			bumpMap: this.config.rendering.normalMaps ? THREE.ImageUtils.loadTexture(require('../../../assets/img/textures/navball-normal.png')) : null,
			bumpScale: 0.25,
			shininess: 80,
		})
		var navballMesh = new THREE.Mesh(navballGeometry, navballMaterial)

		scene.add(navballMesh)

		// Animate callback
		var animate = () => {
			setTimeout(() => {
				requestAnimationFrame(animate)
			}, 1000 / this.config.rendering.fps)

			TWEEN.update()

			renderer.render(scene, camera)
		}
		requestAnimationFrame(animate)

		// Rotation tweening
		var pitch = 0
		var roll = 0
		var heading = 0
		var navballTweenProperties
		var navballTween

		this.$watch(() => this.data['n.pitch'] + this.data['n.roll'] + this.data['n.heading'], () => {
			navballTweenProperties = {
				pitch: pitch,
				roll: roll,
				heading: heading,
			}
			navballTween = new TWEEN.Tween(navballTweenProperties).to({
				// Add normalized delta values to current values
				pitch: pitch + wrapDegDelta(this.data['n.pitch'] - pitch),
				roll: roll + wrapDegDelta(this.data['n.roll'] - roll),
				heading: heading + wrapDegDelta(this.data['n.heading'] - heading),
			}, this.config.telemachus.refreshInterval)

			pitch = this.data['n.pitch']
			roll = this.data['n.roll']
			heading = this.data['n.heading']

			navballTween.onUpdate(() => {
				navballMesh.rotation.order = 'ZXY'
				// Fix rotation offsets to work with KSP texture orientation
				navballMesh.rotation.z = deg2rad(-navballTweenProperties.roll)
				navballMesh.rotation.x = deg2rad(navballTweenProperties.pitch)
				navballMesh.rotation.y = deg2rad(270 - navballTweenProperties.heading)
			})
			navballTween.start()
		})
	},
}
