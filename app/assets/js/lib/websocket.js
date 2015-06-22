import $ from 'jquery'

export default class WS {
	constructor(uri, pingTimeout=30, reconnectTimeout=5) {
		this.uri = uri
		this.conn = null
		this.connDeferred = $.Deferred()
		this.pingTimeout = pingTimeout * 1000
		this.reconnectTimeout = reconnectTimeout * 1000
		this.messageHandlers = []
	}

	connect() {
		try {
			this.conn = new WebSocket(this.uri)

			this.conn.onopen = () => {
				console.info('WS connection opened')
				this.connDeferred.resolve()
			}

			this.conn.onclose = () => {
				console.warn(`WS connection closed, reconnecting in ${this.reconnectTimeout / 1000} seconds`)

				this.connDeferred = $.Deferred()

				setTimeout(this.connect.bind(this), this.reconnectTimeout)
			}

			this.conn.onmessage = ev => {
				// Call all message handlers
				this.messageHandlers.forEach(fn => {
					fn(ev)
				})
			}
		}
		catch (e) {
			this.connDeferred.reject(`Error while initiating WS connection: ${e}`)
		}

		return this.connDeferred
	}

	close(reconnect=false) {
		if (!reconnect) {
			this.conn.onclose = undefined
		}
		this.conn.close()
	}

	addMessageHandler(fn) {
		this.messageHandlers.push(fn)
	}

	send(obj) {
		var deferred = $.Deferred()

		this.connDeferred
			.then(() => {
				if (!this.conn || this.conn.readyState !== WebSocket.OPEN) {
					deferred.reject(`Invalid WS connection to "${this.uri}" (state ${this.conn.readyState})`)
					return
				}
				this.conn.send(JSON.stringify(obj))
				deferred.resolve()
			})
			.fail(() => {
				deferred.reject(`Could not send WS message, not connected to "${this.uri}"`)
			})

		return deferred
	}

	ping() {
		this.send({}).done(() => {
			setTimeout(this.ping.bind(this), this.pingTimeout)
		})
	}
}
