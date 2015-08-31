/*
	League of Legends Item Data Store
 */
var ItemStore = {
	apiVersion: '5.16.1',

	items: {},

	// gets a single item by Id
	getById: function(itemId) {
		return this.items[itemId];
	},

	_notify: [],
	/*
		Calls back fn when this ItemStore is fully initialized
	 */
	notify: function(fn) {
		const token = Math.floor(Math.random() * 10000);
		// are we already initialized?
		if (Object.keys(this.items).length > 10) {
			fn();
		} else {
			this._notify.push({ token: token, fn: fn});
		}
		return token;
	},

	unnotify: function(token) {
		const arr = this._notify.filter(cb => {
			return cb.token !== token;
		});
		this._notify = arr;
	},

	_ready: function() {
		this._notify.forEach(fn => fn.fn());
		// fire once, clear the callbacks
		this._notify = [];
	},

	_initialize: function(itemData) {
		this.items = itemData;

		Object.keys(this.items).forEach(id => {
			const that = this;
		// add the ID to the item itself instead of being only stored as the key
			this.items[id].id = id;
			
		// add a method for retrieving the images URL
		// we do this here so we can centralize the API VERSION & url
		// and in case of future url changes
			this.items[id].getImage = function() {
				return 'http://ddragon.leagueoflegends.com/cdn/' + that.apiVersion + '/img/item/' + id +'.png';
			}
		});

		this._ready();
	}
};

// on startup, fetch item data, then call the actual initialization
((done, ver) => {
	// TODO, handle api version fall backs, and other errors
	const req = new XMLHttpRequest();
	req.addEventListener('load', function() {
		const data = JSON.parse(this.responseText);
		done(data.data);
	});
	req.open('get', 'http://ddragon.leagueoflegends.com/cdn/'+ ver +'/data/en_US/item.json', true);
	req.send();
})(ItemStore._initialize.bind(ItemStore), ItemStore.apiVersion);
