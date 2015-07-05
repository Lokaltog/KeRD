export default class LocalStorage {
	get(key) {
		var value = localStorage.getItem(key)
		if (typeof value !== 'undefined') {
			try {
				value = JSON.parse(value)
			}
			catch (e) {
				console.error('Invalid storage object')
				console.error(e)
			}
		}
		return value
	}
	set(key, value) {
		localStorage.setItem(key, JSON.stringify(value))
	}
	remove(key) {
		localStorage.removeItem(key)
	}
}
