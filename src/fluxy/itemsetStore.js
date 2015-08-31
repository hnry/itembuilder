class ItemSetStore extends DataStore {
	constructor(dispatcher) {
		super(dispatcher);
	}

	getInitialState() {
		return this._reset();
	}

	_fetch(id, cb) {
		const that = this;
		const req = new XMLHttpRequest();
		req.addEventListener('load', function() {
			let res;
			try {
				res = JSON.parse(this.responseText);
			} catch(e) {
				res = { status: 'parse error ' + e};
			}
			cb(res);
		});
		req.open('get', '/itemset/' + id, true);
		req.send();
	}

	_save(cb) {
		const that = this;
		const req = new XMLHttpRequest();
		req.addEventListener('load', function() {
			let res;
			try {
				res = JSON.parse(this.responseText);
			} catch(e) {
				res = { status: 'parse error ' + e };
			}
			cb(res.id, res.status);
		});
		req.open('post', '/create/new', true);
		req.setRequestHeader('Content-Type', 'application/json')
		req.send(JSON.stringify(this._data));
	}

	_reset() {
		return {
			id: 0,
			showFileUpload: 1,
			champion: {},
			description: '',
			itemset: {
			title: '',
			type: 'custom',
			map: 'any',
			mode: 'any',
			priority: false,
			sortrank: 0,
			blocks: [ 
				{	
					type: 'Starting Items',
					recMath: false,
					minSummonerLevel: -1,
					maxSummmonerLevel: -1,
					showIfSummonerSpell: '',
					hideIfSummonerSpell: '',
					items: [ { id: 2003, count: 1 } ] 
				}
			]}
		};
	}

	_onDispatch(payload) {
		const that = this;
		switch (payload.actionType) {
			case 'load_data':
				this._fetch(payload.id, function(resp) {
					that._data = that._reset();
					if (resp.status === 'ok') {
						that._data = resp.data;
						that._emitChange(['id']);
					} else {
						//that._data.loadStatus = resp.status;
					}
				});
				break;
			case 'champion_update':
				this._data.champion = payload.champion;
				this._emitChange(['champion']);
				break;
			case 'upload_itemset':
				this._data.showFileUpload = 0;
				this._data.itemset = payload.data;
				this._emitChange();
				break;
			case 'update_itemset_title':
				this._data.itemset.title = payload.text;
				this._emitChange();
				break;
			case 'update_itemset_block_type':
				this._data.itemset.blocks[payload.idx].type = payload.text;
				this._emitChange();
				break;
			case 'add_itemset_item':
				this._data.itemset.blocks[payload.idx].items.push({
					id: parseInt(payload.itemID),
					count: 1
				});
				this._emitChange();
				break;
			case 'create_itemset_block':
				this._data.itemset.blocks.push(payload.blockObj);
				this._emitChange();
				break;
			case 'delete_itemset_block':
				this._data.itemset.blocks.splice(payload.idx, 1);
				this._emitChange();
				break;
			case 'save_itemset':
				// validation
				let validation = { valid: true, reason: []};
				if (!this._data.champion.riotId) {
					validation.valid = false;
					validation.reason.push('no-champion');
				}
				if (this._data.itemset.title == '') {
					validation.valid = false;
					validation.reason.push('no-title');
				}
				if (!this._data.itemset.blocks.length) {
					validation.valid = false;
					validation.reason.push('no-blocks');
				}

				if (validation.valid) {
					this._save(function(id, status) {
						if (status === 'ok') {
							that._data.id = id;
							that._emitChange(['id']);
						}
						const payload = { id: id, origin: 'server', msg: status };
						appDispatcher.dispatch(APP_ACTIONS.show_save_status(payload));
					});
				} else {
						const payload = { origin: 'app', msg: validation.reason }
						appDispatcher.dispatch(APP_ACTIONS.show_save_status(payload));
				}
				break;
			case 'reset_all':
				this._data = this._reset();
				this._emitChange(['id']);
				break;
		}
	}
}

var itemSetStore = new ItemSetStore(appDispatcher);
