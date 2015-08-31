/*
	Like flux, but more bootleg
 */

class Dispatcher {
	constructor() {
		this.isDispatching = false;
		this._callbacks = [];
		this._lastID = 0;
	}

	register(fn) {
		this._callbacks.push(fn);
		const token = this._lastID + 1;
		this._lastID = token;
		return token;
	}

	dispatch(payload) {
		this.isDispatching = true;
		this._callbacks.forEach(fn => {
			fn(payload);
		});
		this.isDispatching = false;
	}
}
var appDispatcher = new Dispatcher();


class DataStore {
	constructor(dispatcher) {
		const that = this;
		this.dispatchToken = dispatcher.register(function(payload) {
			that._onDispatch(payload);
		});
		this._data = this.getInitialState();
		this._listeners = {
			'_': []
		};
	}

	getInitialState() {
		return {};
	}

	addListener(eventName, fn) {
		const token = Math.floor(Math.random() * 100000);
		if (typeof eventName === 'function') {
			fn = eventName;
			eventName = '_';
		}
		if (!eventName) eventName = '_';

		if (!this._listeners[eventName]) {
			this._listeners[eventName] = [];
		}
		this._listeners[eventName].push({ token: token, fn: fn });

		return token;
	}

	removeListener(eventName, token) {
		if (!eventName) eventName = '_';

		const arr = this._listeners[eventName].filter(cb => {
			return token !== cb.token;
		});
		this._listeners[eventName] = arr;
	}

	_emitChange(eventNames) {
		// we notify specific listeners if their data has changed
		if (eventNames) {
			eventNames.forEach(event => {
				if (this._listeners[event]) {
					this._listeners[event].forEach(cb => {
						cb.fn();
					});
				}
			});
		}
		// we notify general listeners the data has changed
		this._listeners['_'].forEach(cb => {
			cb.fn();
		});
	}

	getAll() {
		return this._data;
	}

	_onDispatch(payload) {

	}
}