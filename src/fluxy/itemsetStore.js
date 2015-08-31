class ItemSetStore extends DataStore {
	constructor(dispatcher) {
		super(dispatcher);
	}

	getInitialState() {
		return {
			id: 0,
			loadStatus: '',
			saveStatus: '',
			showFileUpload: 1,
			champion: {},
			description: '',

			itemset: {
			title: 'The name of the page',
			type: 'custom',
			map: 'any',
			mode: 'any',
			priority: false,
			sortrank: 0,
// * blocks are limited to 20 items *
// soft cap blocks to 50 blocks, not a league limit, just have it..
			blocks: [ 
				{	type: 'a block with just boots',
					recMath: false,
					minSummonerLevel: -1,
					maxSummmonerLevel: -1,
					showIfSummonerSpell: '',
					hideIfSummonerSpell: '',
					id: '1d11d',
					items: [
						{ id: 3001, count: 1 },
						{ id: 1001, count: 1 }
					] },
			{	type: 'another block with just boots',
					recMath: false,
					minSummonerLevel: -1,
					maxSummmonerLevel: -1,
					showIfSummonerSpell: '',
					hideIfSummonerSpell: '',
					id: 'asg2g2',
					items: [
						{ id: 1018, count: 2 },
						{ id: 1001, count: 1 }
					] }
			]
			}
		};
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
		console.log('resettting')
		this._data = {
			id: 0,
			loadStatus: '',
			saveStatus: '',
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
					items: [ { id: 1018, count: 1 },  { id: 1027, count: 1 } ] 
				}
			]}
		};
	}

	_onDispatch(payload) {
		const that = this;
		switch (payload.actionType) {
			case 'load_data':
				this._fetch(payload.id, function(resp) {
					that._reset();
					if (resp.status === 'ok') {
						that._data = resp.data;
					} else {
						that._data.loadStatus = resp.status;
					}
					that._emitChange(['saveStatus']);
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
				console.log('dispatch')
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
						}
						that._data.saveStatus = { origin: 'server', msg: status };
						that._emitChange(['saveStatus']);
					});
				} else {
					this._data.saveStatus = { origin: 'app', msg: validation.reason };
					this._emitChange(['saveStatus']);
				}
				break;
			case 'got_save_status':
				this._data.saveStatus = '';
				this._emitChange(['saveStatus']);
				break;
			case 'reset_all':
				this._reset();
				this._emitChange(['saveStatus']);
				break;
		}
	}
}

var itemSetStore = new ItemSetStore(appDispatcher);
