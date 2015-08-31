/*
	Just a store to store global state for the app
 */

class AppStore extends DataStore {
	constructor(dispatcher) {
		super(dispatcher);
	}

	getInitialState() {
		return this._reset();
	}

	_reset() {
		return {
			showShare: 0,
			showDownload: 0,
			showInfo: 0
		}
	}

	_onDispatch(payload) {
		const that = this;
		switch (payload.actionType) {
			case 'show_share':
				this._data.showShare = 1;
				this._emitChange();
				break;
			case 'show_download':
				this._data.showDownload = 1;
				this._emitChange();
				break;
			case 'show_info':
				this._data.showInfo = 1;
				this._emitChange();
				break;
			case 'app_hide_popup':
				this._data = this._reset();
				this._emitChange();
				break;
		}
	}
}

var appStore = new AppStore(appDispatcher);
