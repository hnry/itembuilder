(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function atoa (a, n) { return Array.prototype.slice.call(a, n); }

},{}],2:[function(require,module,exports){
'use strict';

var ticky = require('ticky');

module.exports = function debounce (fn, args, ctx) {
  if (!fn) { return; }
  ticky(function run () {
    fn.apply(ctx || null, args || []);
  });
};

},{"ticky":4}],3:[function(require,module,exports){
'use strict';

var atoa = require('atoa');
var debounce = require('./debounce');

module.exports = function emitter (thing, options) {
  var opts = options || {};
  var evt = {};
  if (thing === undefined) { thing = {}; }
  thing.on = function (type, fn) {
    if (!evt[type]) {
      evt[type] = [fn];
    } else {
      evt[type].push(fn);
    }
    return thing;
  };
  thing.once = function (type, fn) {
    fn._once = true; // thing.off(fn) still works!
    thing.on(type, fn);
    return thing;
  };
  thing.off = function (type, fn) {
    var c = arguments.length;
    if (c === 1) {
      delete evt[type];
    } else if (c === 0) {
      evt = {};
    } else {
      var et = evt[type];
      if (!et) { return thing; }
      et.splice(et.indexOf(fn), 1);
    }
    return thing;
  };
  thing.emit = function () {
    var args = atoa(arguments);
    return thing.emitterSnapshot(args.shift()).apply(this, args);
  };
  thing.emitterSnapshot = function (type) {
    var et = (evt[type] || []).slice(0);
    return function () {
      var args = atoa(arguments);
      var ctx = this || thing;
      if (type === 'error' && opts.throws !== false && !et.length) { throw args.length === 1 ? args[0] : args; }
      et.forEach(function emitter (listen) {
        if (opts.async) { debounce(listen, args, ctx); } else { listen.apply(ctx, args); }
        if (listen._once) { thing.off(type, listen); }
      });
      return thing;
    };
  };
  return thing;
};

},{"./debounce":2,"atoa":1}],4:[function(require,module,exports){
var si = typeof setImmediate === 'function', tick;
if (si) {
  tick = function (fn) { setImmediate(fn); };
} else {
  tick = function (fn) { setTimeout(fn, 0); };
}

module.exports = tick;
},{}],5:[function(require,module,exports){
(function (global){

var NativeCustomEvent = global.CustomEvent;

function useNative () {
  try {
    var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
    return  'cat' === p.type && 'bar' === p.detail.foo;
  } catch (e) {
  }
  return false;
}

/**
 * Cross-browser `CustomEvent` constructor.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
 *
 * @public
 */

module.exports = useNative() ? NativeCustomEvent :

// IE >= 9
'function' === typeof document.createEvent ? function CustomEvent (type, params) {
  var e = document.createEvent('CustomEvent');
  if (params) {
    e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  } else {
    e.initCustomEvent(type, false, false, void 0);
  }
  return e;
} :

// IE <= 8
function CustomEvent (type, params) {
  var e = document.createEventObject();
  e.type = type;
  if (params) {
    e.bubbles = Boolean(params.bubbles);
    e.cancelable = Boolean(params.cancelable);
    e.detail = params.detail;
  } else {
    e.bubbles = false;
    e.cancelable = false;
    e.detail = void 0;
  }
  return e;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
(function (global){
'use strict';

var customEvent = require('custom-event');
var eventmap = require('./eventmap');
var doc = global.document;
var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
  removeEvent = removeEventHard;
}

module.exports = {
  add: addEvent,
  remove: removeEvent,
  fabricate: fabricateEvent
};

function addEventEasy (el, type, fn, capturing) {
  return el.addEventListener(type, fn, capturing);
}

function addEventHard (el, type, fn) {
  return el.attachEvent('on' + type, wrap(el, type, fn));
}

function removeEventEasy (el, type, fn, capturing) {
  return el.removeEventListener(type, fn, capturing);
}

function removeEventHard (el, type, fn) {
  var listener = unwrap(el, type, fn);
  if (listener) {
    return el.detachEvent('on' + type, listener);
  }
}

function fabricateEvent (el, type, model) {
  var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
  if (el.dispatchEvent) {
    el.dispatchEvent(e);
  } else {
    el.fireEvent('on' + type, e);
  }
  function makeClassicEvent () {
    var e;
    if (doc.createEvent) {
      e = doc.createEvent('Event');
      e.initEvent(type, true, true);
    } else if (doc.createEventObject) {
      e = doc.createEventObject();
    }
    return e;
  }
  function makeCustomEvent () {
    return new customEvent(type, { detail: model });
  }
}

function wrapperFactory (el, type, fn) {
  return function wrapper (originalEvent) {
    var e = originalEvent || global.event;
    e.target = e.target || e.srcElement;
    e.preventDefault = e.preventDefault || function preventDefault () { e.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
    e.which = e.which || e.keyCode;
    fn.call(el, e);
  };
}

function wrap (el, type, fn) {
  var wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
  hardCache.push({
    wrapper: wrapper,
    element: el,
    type: type,
    fn: fn
  });
  return wrapper;
}

function unwrap (el, type, fn) {
  var i = find(el, type, fn);
  if (i) {
    var wrapper = hardCache[i].wrapper;
    hardCache.splice(i, 1); // free up a tad of memory
    return wrapper;
  }
}

function find (el, type, fn) {
  var i, item;
  for (i = 0; i < hardCache.length; i++) {
    item = hardCache[i];
    if (item.element === el && item.type === type && item.fn === fn) {
      return i;
    }
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./eventmap":7,"custom-event":5}],7:[function(require,module,exports){
(function (global){
'use strict';

var eventmap = [];
var eventname = '';
var ron = /^on/;

for (eventname in global) {
  if (ron.test(eventname)) {
    eventmap.push(eventname.slice(2));
  }
}

module.exports = eventmap;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _createCreate = require('./create/create');

var _createCreate2 = _interopRequireDefault(_createCreate);

var _viewView = require('./view/view');

var _viewView2 = _interopRequireDefault(_viewView);

var Router = window.ReactRouter;
var DefaultRoute = Router.DefaultRoute;
var Route = Router.Route;
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;

var App = React.createClass({
	displayName: 'App',

	styles: {
		disableNav: 'disable'
	},

	getInitialState: function getInitialState() {
		var initID = itemSetStore.getAll();

		return {
			apiVersion: '5.16.1',
			id: initID.id
		};
	},

	componentDidMount: function componentDidMount() {
		// gets alerted on every save attempt, even for fail saves
		itemSetStore.addListener('saveStatus', this._onChange);
	},

	_onChange: function _onChange() {
		var data = itemSetStore.getAll();
		this.setState({ id: data.id });
	},

	mixins: [Router.State],

	_onNavSave: function _onNavSave(e) {
		appDispatcher.dispatch(APP_ACTIONS.save_itemset());
	},

	_onNavDownload: function _onNavDownload(e) {
		e.stopPropagation();
		appDispatcher.dispatch(APP_ACTIONS.show_download());
		return false;
	},

	_onNavShare: function _onNavShare(e) {
		e.stopPropagation();
		appDispatcher.dispatch(APP_ACTIONS.show_share());
		return false;
	},

	_onNavInfo: function _onNavInfo(e) {
		e.stopPropagation();
		appDispatcher.dispatch(APP_ACTIONS.show_info());
		return false;
	},

	renderLinks: function renderLinks(link, glyph, name) {
		var _this = this;

		/*
  	The mode we are in depends on if we have document ID for an itemset
  	Different links for different modes
  	There is a view mode
  	And a create mode
   */
		var id = this.state.id;

		var viewLinks = [{ url: 'create', glyph: 'glyphicon-file', text: 'New' }, { url: 'edit', params: id, glyph: 'glyphicon-pencil', text: 'Edit' }, { url: 'view', params: id, onClick: this._onNavDownload, glyph: 'glyphicon-save', text: 'Download' }, { url: 'view', params: id, onClick: this._onNavShare, glyph: 'glyphicon-share', text: 'Share' }, { url: 'view', params: id, onClick: this._onNavInfo, glyph: 'glyphicon-equalizer', text: 'About' }];
		var createLinks = [{ url: 'create', glyph: 'glyphicon-file', text: 'New' }, { url: 'create', onClick: this._onNavSave, glyph: 'glyphicon-ok', text: 'Save' },
		// the rest of these links only available if saved
		{ url: 'view', params: id, glyph: 'glyphicon-unchecked', text: 'View', needID: true }, { url: 'create', onClick: this._onNavDownload, glyph: 'glyphicon-save', text: 'Download', needID: true }, { url: 'create', onClick: this._onNavShare, glyph: 'glyphicon-share', text: 'Share', needID: true }, { url: 'create', onClick: this._onNavInfo, glyph: 'glyphicon-equalizer', text: 'About' }];

		var mode = createLinks;
		if (this.isActive('view')) {
			mode = viewLinks;
		}

		return mode.map(function (link) {
			var inner = React.createElement(
				'div',
				null,
				React.createElement(
					'div',
					{ className: 'sidebar-icon' },
					React.createElement('span', { className: 'glyphicon ' + link.glyph })
				),
				React.createElement(
					'span',
					null,
					link.text
				)
			);

			var r = undefined;

			// disable certain menu options when we don't
			// have an ID
			if (link.needID && !_this.state.id) {
				r = React.createElement(
					'div',
					{ className: _this.styles.disableNav },
					inner
				);
			} else {
				if (link['onClick']) {
					r = React.createElement(
						Link,
						{ to: link.url, params: { id: link.params }, onClick: link['onClick'] },
						inner
					);
				} else {
					r = React.createElement(
						Link,
						{ to: link.url, params: { id: link.params } },
						inner
					);
				}
			}

			return React.createElement(
				'div',
				{ key: link.text + (link.params || ''), className: 'sidebar-link' },
				r
			);
		});
	},

	render: function render() {
		return React.createElement(
			'div',
			null,
			React.createElement(
				'div',
				{ className: 'col-xs-2 col-md-2 sidebar' },
				React.createElement(
					'div',
					{ className: 'sidebar-logo' },
					React.createElement(
						'span',
						{ className: 'sidebar-link-text xfont-thin' },
						'Item Builder'
					)
				),
				this.renderLinks()
			),
			React.createElement(
				'div',
				{ className: 'col-xs-9 col-md-9 col-xs-offset-1 col-md-offset-1 content' },
				React.createElement(RouteHandler, { apiVersion: this.state.apiVersion })
			)
		);
	}

});

var routes = React.createElement(
	Route,
	{ name: 'app', path: '/', handler: App },
	React.createElement(Route, { name: 'create', handler: _createCreate2['default'] }),
	React.createElement(Route, { name: 'view', path: 'view/:id', handler: _viewView2['default'] }),
	React.createElement(Route, { name: 'edit', path: 'edit/:id', handler: _createCreate2['default'] }),
	React.createElement(DefaultRoute, { handler: _createCreate2['default'] })
);

Router.run(routes, Router.HistoryLocation, function (Handler) {
	React.render(React.createElement(Handler, null), document.getElementById('app'));
});

exports['default'] = App;
module.exports = exports['default'];

},{"./create/create":9,"./view/view":29}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _itemDisplayIndex = require('./itemDisplay/index');

var _itemDisplayIndex2 = _interopRequireDefault(_itemDisplayIndex);

var _itemSetIndex = require('./itemSet/index');

var _itemSetIndex2 = _interopRequireDefault(_itemSetIndex);

var _saveResult = require('./saveResult');

var _saveResult2 = _interopRequireDefault(_saveResult);

var _info = require('../info');

var _info2 = _interopRequireDefault(_info);

var Create = (function (_React$Component) {
	_inherits(Create, _React$Component);

	function Create() {
		_classCallCheck(this, Create);

		_get(Object.getPrototypeOf(Create.prototype), 'constructor', this).call(this);

		this.styles = {
			/*
   champSelectWrap: 'item-champ-select-wrap',
   champSelect: 'item-champ-select',
   championSelectBlock: 'item-champ-select-block'
   */
		};

		this.state = itemSetStore.getAll();
		this.state.app = appStore.getAll();

		this.tokenChampion = 0;
		this.tokenSaveStatus = 0;
		this.tokenItemStore = 0;
		this.tokenAppStore = 0;
	}

	_createClass(Create, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var that = this;

			this.tokenItemStore = ItemStore.notify(function () {
				that.setState({ items: ItemStore.items });
			});

			this.tokenChampion = itemSetStore.addListener('champion', this._onChange.bind(this));
			this.tokenSaveStatus = itemSetStore.addListener('saveStatus', this._onChange.bind(this));

			this.tokenAppStore = appStore.addListener(this._onAppChange.bind(this));

			// if we don't get an ID, we reset the item set store state
			// if we get an ID it means it's /edit which the store needs to load
			if (this.props.params && this.props.params.id) {
				appDispatcher.dispatch(APP_ACTIONS.load_data(this.props.params.id));
			} else {
				appDispatcher.dispatch(APP_ACTIONS.reset_all());
			}
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			ItemStore.unnotify(this.tokenItemStore);
			itemSetStore.removeListener('champion', this.tokenChampion);
			itemSetStore.removeListener('saveStatus', this.tokenSaveStatus);
			appStore.removeListener('', this.tokenAppStore);
		}
	}, {
		key: '_onChange',
		value: function _onChange() {
			var data = itemSetStore.getAll();
			this.setState({ champion: data.champion, saveStatus: data.saveStatus });
		}
	}, {
		key: '_onAppChange',
		value: function _onAppChange() {
			var data = appStore.getAll();
			this.setState({ app: data });
		}
	}, {
		key: 'onChampionSelect',
		value: function onChampionSelect(championObj) {
			appDispatcher.dispatch(APP_ACTIONS.champion_update(championObj));
		}
	}, {
		key: 'savePopUp',
		value: function savePopUp() {
			if (this.state.saveStatus) {
				return React.createElement(_saveResult2['default'], { result: this.state.saveStatus });
			}
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'row' },
				this.savePopUp(),
				React.createElement(_info2['default'], { show: this.state.app.showInfo }),
				React.createElement(_itemDisplayIndex2['default'], { items: this.state.items }),
				React.createElement(_itemSetIndex2['default'], { apiVersion: this.props.apiVersion, champion: this.state.champion, showDownload: this.state.app.showDownload, showShare: this.state.app.showShare, handleChampionSelect: this.onChampionSelect.bind(this) })
			);
		}
	}]);

	return Create;
})(React.Component);

exports['default'] = Create;
module.exports = exports['default'];

},{"../info":26,"./itemDisplay/index":10,"./itemSet/index":16,"./saveResult":21}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _itemCategories = require('./itemCategories');

var _itemCategories2 = _interopRequireDefault(_itemCategories);

var _itemDisplay = require('./itemDisplay');

var _itemDisplay2 = _interopRequireDefault(_itemDisplay);

var _itemSearch = require('./itemSearch');

var _itemSearch2 = _interopRequireDefault(_itemSearch);

var getBaseCategories = function getBaseCategories() {
	var baseCategories = {
		'All Items': [],
		'Starting Items': [{ name: 'Jungle', tags: ['Jungle'], checked: false }, { name: 'Lane', tags: ['Lane'], checked: false }],
		'Tools': [{ name: 'Consumable', tags: ['Consumable'], checked: false }, { name: 'Gold Income', tags: ['GoldPer'], checked: false }, { name: 'Vision & Trinkets', tags: ['Vision', 'Trinket'], checked: false }],
		'Defense': [{ name: 'Armor', tags: ['Armor'], checked: false }, { name: 'Health', tags: ['Health'], checked: false }, { name: 'Health Regen', tags: ['HealthRegen'], checked: false }],
		'Attack': [{ name: 'Attack Speed', tags: ['AttackSpeed'], checked: false }, { name: 'Critical Strike', tags: ['CriticalStrike'], checked: false }, { name: 'Damage', tags: ['Damage'], checked: false }, { name: 'Life Steal', tags: ['LifeSteal', 'SpellVamp'], checked: false }],
		'Magic': [{ name: 'Cooldown Reduction', tags: ['CooldownReduction'], checked: false }, { name: 'Mana', tags: ['Mana'], checked: false }, { name: 'Mana Regen', tags: ['ManaRegen'], checked: false }, { name: 'Ability Power', tags: ['SpellDamage'], checked: false }],
		'Movement': [{ name: 'Boots', tags: ['Boots'], checked: false }, { name: 'Other Movement', tags: ['NonbootsMovement'], checked: false }]
	};
	return baseCategories;
};

var ItemDisplayWidget = (function (_React$Component) {
	_inherits(ItemDisplayWidget, _React$Component);

	function ItemDisplayWidget() {
		_classCallCheck(this, ItemDisplayWidget);

		_get(Object.getPrototypeOf(ItemDisplayWidget.prototype), 'constructor', this).call(this);

		this.styles = {
			itemDisplayWrapper: ' item-display-box-wrap'
		};

		this.state = { categories: getBaseCategories(), search: '' };
	}

	_createClass(ItemDisplayWidget, [{
		key: 'changeCategories',
		value: function changeCategories(categoryName, subCategory) {
			var cats = [];
			var categories = this.state.categories;

			if (typeof subCategory === 'undefined') {
				// reset all checks when a parent category is clicked
				//
				// TODO! this makes it set a bunch of AND tags to filter
				// we want OR, we might not even want this code here...
				categories = getBaseCategories();
				cats = Array.apply(0, Array(categories[categoryName].length)).map(function (x, y) {
					return y;
				});
			} else {
				cats.push(subCategory);
			}

			// hacky and too strict and literal, but whatever
			if (categoryName !== 'All Items') {
				cats.forEach(function (cat) {
					var c = categories[categoryName][cat];
					c.checked ? c.checked = false : c.checked = true;
				});
			}

			this.setState({ categories: categories, search: '' });
		}
	}, {
		key: 'changeSearch',
		value: function changeSearch(searchTerm) {
			this.setState({ search: searchTerm, categories: getBaseCategories() });
		}

		/*
  	Returns items filtered by search or category or none
  		TODO!!!
  	filterTags with categories with more than 1 tag causes a AND condition
  	but it should be an OR condition Jungle and Vision & Trinket
  	means it matches [jungle, vision, trinket]
  	but it should be [jungle] and [vision OR trinket]
   */
	}, {
		key: 'getItems',
		value: function getItems() {
			var _this = this;

			if (!this.props.items) {
				return [];
			}
			// we could just leave filterBy as 'search' by default
			// since it will also return all items if search === ''
			// but i figure it will be more performant if there is no indexOf check
			// for every item
			var filterBy = undefined;
			var filterTags = [];

			// check if it's by search first to avoid looping categories for tags
			if (this.state.search && this.state.search !== '') {
				filterBy = 'search';
			} else {
				Object.keys(this.state.categories).forEach(function (key) {
					_this.state.categories[key].forEach(function (cat) {
						if (cat.checked) {
							cat.tags.forEach(function (tag) {
								return filterTags.push(tag);
							});
						}
					});
				});

				if (filterTags.length) filterBy = 'tags';
			}

			return Object.keys(this.props.items).reduce(function (r, itemID) {
				var item = _this.props.items[itemID];
				// filter by search or tags or none
				if (filterBy === 'search') {
					if (item.name.toLowerCase().indexOf(_this.state.search.toLowerCase()) !== -1) {
						r.push(item);
					} else {
						// also use search term on tags
						var result = item.tags.filter(function (tag) {
							return tag.toLowerCase() === _this.state.search.toLowerCase();
						});
						if (result.length) r.push(item);
					}
				} else if (filterBy === 'tags') {
					// have to have every tag in filterTags
					var result = filterTags.filter(function (fTag) {
						return item.tags.filter(function (iTag) {
							// we lowercase check just in case riot api data
							// isn't uniformed and has some tags with weird casing
							return fTag.toLowerCase() === iTag.toLowerCase();
						}).length;
					});
					if (result.length === filterTags.length) r.push(item);
				} else {
					r.push(item);
				}

				return r;
			}, []);
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'col-xs-5 col-sm-5 col-md-5' + this.styles.itemDisplayWrapper },
				React.createElement(
					'div',
					{ className: 'row' },
					React.createElement(
						'div',
						{ className: 'col-xs-12 col-sm-12 col-md-12' },
						React.createElement(_itemSearch2['default'], { searchValue: this.state.search, onSearch: this.changeSearch.bind(this) })
					)
				),
				React.createElement(
					'div',
					{ className: 'row' },
					React.createElement(
						'div',
						{ className: 'col-xs-6 col-sm-6 col-md-6' },
						React.createElement(_itemCategories2['default'], { categories: this.state.categories, onCategoryCheck: this.changeCategories.bind(this) })
					),
					React.createElement(
						'div',
						{ className: 'col-xs-6 col-sm-6 col-md-6' },
						React.createElement(_itemDisplay2['default'], { items: this.getItems() })
					)
				)
			);
		}
	}]);

	return ItemDisplayWidget;
})(React.Component);

exports['default'] = ItemDisplayWidget;
module.exports = exports['default'];

},{"./itemCategories":11,"./itemDisplay":12,"./itemSearch":13}],11:[function(require,module,exports){
/*
	Item categories filter for itemDisplay
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ItemCategories = (function (_React$Component) {
	_inherits(ItemCategories, _React$Component);

	function ItemCategories() {
		_classCallCheck(this, ItemCategories);

		_get(Object.getPrototypeOf(ItemCategories.prototype), 'constructor', this).call(this);

		this.handleChange = this.handleChange.bind(this);

		this.styles = {
			wrapper: 'item-category-wrap',
			parentCategory: 'category-wrap', // wrapper
			subCategory: 'sub-category-wrap xfont-thin', // wrapper
			parentCategoryTitle: 'xfont category-title text-center'
		};
	}

	/*
 	When a sub category is clicked
  */

	_createClass(ItemCategories, [{
		key: 'handleChange',
		value: function handleChange(event) {
			// [key, index for key] ie: categories['Starting Lane'][1] for Lane
			var categoryId = event.target.value.split(',');
			var categoryName = categoryId[0];
			var subCategory = parseInt(categoryId[1]);

			this.props.onCategoryCheck(categoryName, subCategory);
		}

		/*
  	When a main category is clicked
   */
	}, {
		key: 'handleCategory',
		value: function handleCategory(categoryName) {
			this.props.onCategoryCheck(categoryName);
		}
	}, {
		key: 'renderSubCategories',
		value: function renderSubCategories(categories, parentCategory) {
			var _this = this;

			return categories.map(function (cat, idx) {
				return React.createElement(
					'div',
					{ key: cat.name, className: _this.styles.subCategory },
					React.createElement(
						'label',
						null,
						React.createElement('input', { type: 'checkbox', value: [parentCategory, idx], onChange: _this.handleChange, checked: cat.checked }),
						' ',
						cat.name
					)
				);
			});
		}
	}, {
		key: 'renderCategories',
		value: function renderCategories() {
			var _this2 = this;

			return Object.keys(this.props.categories).map(function (key) {
				var subCategories = _this2.props.categories[key];
				return React.createElement(
					'div',
					{ key: key, className: _this2.styles.parentCategory },
					React.createElement(
						'span',
						{ className: _this2.styles.parentCategoryTitle },
						React.createElement(
							'a',
							{ href: '#', onClick: _this2.handleCategory.bind(_this2, key) },
							key
						)
					),
					_this2.renderSubCategories(subCategories, key)
				);
			});
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: this.styles.wrapper },
				this.renderCategories()
			);
		}
	}]);

	return ItemCategories;
})(React.Component);

exports['default'] = ItemCategories;
module.exports = exports['default'];

},{}],12:[function(require,module,exports){
/*
	Displays all available or filtered (by search or categories) items
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _itemButton = require('../../itemButton');

var _itemButton2 = _interopRequireDefault(_itemButton);

var ItemDisplay = (function (_React$Component) {
	_inherits(ItemDisplay, _React$Component);

	function ItemDisplay() {
		_classCallCheck(this, ItemDisplay);

		_get(Object.getPrototypeOf(ItemDisplay.prototype), 'constructor', this).call(this);

		this.styles = {
			wrapper: 'item-display-wrap'
		};
	}

	_createClass(ItemDisplay, [{
		key: 'renderItems',
		value: function renderItems() {
			return this.props.items.map(function (item) {
				return React.createElement(_itemButton2['default'], { key: item.id, item: item });
			});
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ id: 'item-display', className: this.styles.wrapper },
				this.renderItems()
			);
		}
	}]);

	return ItemDisplay;
})(React.Component);

exports['default'] = ItemDisplay;
module.exports = exports['default'];

},{"../../itemButton":27}],13:[function(require,module,exports){
/*
	Search bar for itemDisplay
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ItemSearch = (function (_React$Component) {
	_inherits(ItemSearch, _React$Component);

	function ItemSearch() {
		_classCallCheck(this, ItemSearch);

		_get(Object.getPrototypeOf(ItemSearch.prototype), 'constructor', this).call(this);
		this.styles = {
			wrapper: 'input-group input-group-sm',
			searchBar: 'form-control'
		};
	}

	_createClass(ItemSearch, [{
		key: 'handleSearch',
		value: function handleSearch(event) {
			this.props.onSearch(event.target.value);
		}

		// why do i need to bind this.handleSearch and in the parent handler function? ES6 classes?
		// React auto did this for me with React.createClass
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: this.styles.wrapper },
				React.createElement('input', { className: this.styles.searchBar, type: 'text', placeholder: 'Search Items', onChange: this.handleSearch.bind(this), value: this.props.searchValue })
			);
		}
	}]);

	return ItemSearch;
})(React.Component);

exports['default'] = ItemSearch;
module.exports = exports['default'];

},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ChampionSelect = (function (_React$Component) {
	_inherits(ChampionSelect, _React$Component);

	function ChampionSelect() {
		_classCallCheck(this, ChampionSelect);

		_get(Object.getPrototypeOf(ChampionSelect.prototype), 'constructor', this).call(this);

		this.searchChampions = this.searchChampions.bind(this);

		this.styles = {
			championDropDownWrap: 'item-champion-dropdown-wrap',
			championDropDown: 'item-champion-dropdown',
			hide: 'hidden'
		};

		this.state = {
			searchValue: '',
			showDropDown: false
		};
	}

	_createClass(ChampionSelect, [{
		key: 'onDropDown',
		value: function onDropDown(bool, event) {
			var that = this;
			var set = function set() {
				that.setState({ showDropDown: bool });
			};

			// hacky way to get mouse clicks to trigger first before onBlur
			if (!bool) {
				setTimeout(set, 200);
			} else {
				set();
			}
		}
	}, {
		key: 'searchChampions',
		value: function searchChampions(event) {
			this.setState({ searchValue: event.target.value });
		}

		/* 
  	When user presses enter, we need to verify if the champion actually exists
  	Do nothing if it does not
  */
	}, {
		key: 'handleSubmit',
		value: function handleSubmit(event) {
			var _this = this;

			if (event.which === 13) {
				(function () {
					// enter
					var input = event.target.value.toLowerCase();
					var champ = ChampionData.filter(function (champion) {
						return champion.name.toLowerCase() === input || champion.riotKey.toLowerCase() === input;
					});

					if (champ.length) {
						_this.onChampionSelect(champ[0]);
					}
				})();
			}
		}
	}, {
		key: 'onChampionSelect',
		value: function onChampionSelect(champion) {
			this.props.handleChampionSelect(champion);
		}
	}, {
		key: 'renderSearchResultsItems',
		value: function renderSearchResultsItems() {
			var _this2 = this;

			var searchTerm = this.state.searchValue.toLowerCase();
			var champions = ChampionData;

			// first filter by search		
			if (searchTerm) {
				champions = ChampionData.filter(function (champ) {
					var name = champ.name.toLowerCase();
					var keyname = champ.riotKey.toLowerCase();
					return name.indexOf(searchTerm) === 0 || keyname.indexOf(searchTerm) == 0;
				});
			}

			// sort by name / first letter of name
			champions.sort(function (a, b) {
				var aa = a.name[0].charCodeAt();
				var bb = b.name[0].charCodeAt();
				if (aa > bb) {
					return 1;
				} else if (bb > aa) {
					return -1;
				} else {
					return 0;
				}
			});

			// we only show the first 10 of the results
			var championslimit = champions.slice(0, 10);

			return championslimit.map(function (champion) {
				return React.createElement(
					'li',
					{ key: champion.riotId, onClick: _this2.onChampionSelect.bind(_this2, champion) },
					React.createElement('img', { src: 'http://ddragon.leagueoflegends.com/cdn/' + _this2.props.apiVersion + '/img/champion/' + champion.riotKey + '.png' }),
					React.createElement(
						'span',
						null,
						champion.name
					)
				);
			});
		}
	}, {
		key: 'renderSearchResults',
		value: function renderSearchResults() {
			var cls = this.styles.championDropDownWrap;
			if (!this.state.showDropDown) {
				cls += ' ' + this.styles.hide;
			}

			return React.createElement(
				'div',
				{ className: cls },
				React.createElement(
					'ul',
					{ className: this.styles.championDropDown },
					this.renderSearchResultsItems()
				)
			);
		}
	}, {
		key: 'render',
		value: function render() {
			var imageUrl = 'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.champion.riotKey + '.png';
			var renderPickerOrChampion = React.createElement(
				'h2',
				null,
				this.props.champion.name
			);

			if (!this.props.champion.riotId) {
				imageUrl = 'http://ddragon.leagueoflegends.com/cdn/5.2.1/img/ui/champion.png';
				// render the champion picker
				renderPickerOrChampion = React.createElement(
					'div',
					{ onBlur: this.onDropDown.bind(this, false) },
					React.createElement('input', { type: 'text', placeholder: 'Pick a Champion for this build', value: this.state.searchValue, onChange: this.searchChampions, onFocus: this.onDropDown.bind(this, true), onKeyUp: this.handleSubmit.bind(this), onKeyDown: this.handleSubmit.bind(this) }),
					this.renderSearchResults()
				);
			}

			return React.createElement(
				'div',
				{ className: 'row' },
				React.createElement('img', { src: imageUrl }),
				renderPickerOrChampion
			);
		}
	}]);

	return ChampionSelect;
})(React.Component);

exports['default'] = ChampionSelect;
module.exports = exports['default'];

},{}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CreateBlock = (function (_React$Component) {
	_inherits(CreateBlock, _React$Component);

	function CreateBlock() {
		_classCallCheck(this, CreateBlock);

		_get(Object.getPrototypeOf(CreateBlock.prototype), 'constructor', this).call(this);

		this.styles = {
			itemBlock: 'item-block',
			item_block_add: 'item-set-add-block'
		};
	}

	_createClass(CreateBlock, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.props.addDrag(this.refs.drag.getDOMNode());
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ ref: 'drag', id: 'create-block', className: 'row ' + this.styles.itemBlock, onClick: this.props.handlerCreate },
				React.createElement(
					'div',
					{ className: this.styles.item_block_add },
					'Drag Items Here to Create a New Block'
				)
			);
		}
	}]);

	return CreateBlock;
})(React.Component);

exports['default'] = CreateBlock;
module.exports = exports['default'];

},{}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _championSelect = require('./championSelect');

var _championSelect2 = _interopRequireDefault(_championSelect);

var _itemBlocks = require('./itemBlocks');

var _itemBlocks2 = _interopRequireDefault(_itemBlocks);

var _upload = require('./upload');

var _upload2 = _interopRequireDefault(_upload);

var _createBlock = require('./createBlock');

var _createBlock2 = _interopRequireDefault(_createBlock);

var _mapSelect = require('./mapSelect');

var _mapSelect2 = _interopRequireDefault(_mapSelect);

var _share = require('../../share');

var _share2 = _interopRequireDefault(_share);

var _download = require('../../download');

var _download2 = _interopRequireDefault(_download);

var dragula = require('../../dragula/react-dragula');

var ItemSetWidget = (function (_React$Component) {
	_inherits(ItemSetWidget, _React$Component);

	function ItemSetWidget() {
		_classCallCheck(this, ItemSetWidget);

		_get(Object.getPrototypeOf(ItemSetWidget.prototype), 'constructor', this).call(this);

		this.styles = {
			itemSetWrapper: '',
			itemBlock: 'item-block',
			item_block_add: 'item-set-add-block',
			buttonSave: 'btn btn-default'
		};

		this.state = itemSetStore.getAll();

		this.token = 0;

		this.dr = dragula({
			copy: false
		});
	}

	_createClass(ItemSetWidget, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.token = itemSetStore.addListener(this._onChange.bind(this));

			var that = this;
			this.dr.containers.push(document.querySelector('#item-display'));

			this.dr.on('drop', function (el, target, src) {
				var id = el.getAttribute('data-item-id');
				var idx = target.getAttribute('data-block-idx');
				if ((idx === 0 || idx) && src.id == 'item-display' && target.id != 'item-display') {
					appDispatcher.dispatch(APP_ACTIONS.add_itemset_item(idx, id));
				} else if (src.id == 'item-display' && target.id == 'create-block') {
					that.onCreateBlock([{ id: id, count: 1 }]);
				}
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			itemSetStore.removeListener('', this.token);
		}
	}, {
		key: '_onChange',
		value: function _onChange() {
			this.setState(itemSetStore.getAll());
		}
	}, {
		key: 'addDragContainer',
		value: function addDragContainer(el) {
			this.dr.containers.push(el);
		}
	}, {
		key: 'changeTitle',
		value: function changeTitle(event) {
			appDispatcher.dispatch(APP_ACTIONS.update_itemset_title(event.target.value));
		}
	}, {
		key: 'changeType',
		value: function changeType(blockIdx, txt) {
			appDispatcher.dispatch(APP_ACTIONS.update_itemset_block_type(blockIdx, txt));
		}
	}, {
		key: 'onCreateBlock',
		value: function onCreateBlock(items, event) {
			var i = [];
			if (!event) i = items;
			appDispatcher.dispatch(APP_ACTIONS.create_itemset_block({
				type: '',
				recMath: false,
				minSummonerLevel: -1,
				maxSummmonerLevel: -1,
				showIfSummonerSpell: '',
				hideIfSummonerSpell: '',
				items: i
			}));
		}
	}, {
		key: 'onRemoveBlock',
		value: function onRemoveBlock(idx) {
			appDispatcher.dispatch(APP_ACTIONS.delete_itemset_block(idx));
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'col-xs-6 col-sm-6 col-md-6' + this.styles.itemSetWrapper },
				React.createElement(_share2['default'], { id: this.state.id, show: this.props.showShare }),
				React.createElement(_download2['default'], { show: this.props.showDownload, id: this.state.id, data: this.state.itemset }),
				React.createElement(_upload2['default'], { show: this.state.showFileUpload }),
				React.createElement('br', null),
				React.createElement(_championSelect2['default'], { handleChampionSelect: this.props.handleChampionSelect, apiVersion: this.props.apiVersion, champion: this.props.champion }),
				React.createElement(_mapSelect2['default'], null),
				React.createElement('br', null),
				React.createElement(
					'div',
					{ className: 'row' },
					React.createElement('input', { className: 'form-control', type: 'text', value: this.state.itemset.title, placeholder: 'Name your item set build', onChange: this.changeTitle.bind(this) })
				),
				React.createElement('br', null),
				React.createElement(_itemBlocks2['default'], { addDrag: this.addDragContainer.bind(this), blocks: this.state.itemset.blocks, handleBlockType: this.changeType.bind(this), handleRemoveBlock: this.onRemoveBlock.bind(this) }),
				React.createElement(_createBlock2['default'], { addDrag: this.addDragContainer.bind(this), handlerCreate: this.onCreateBlock.bind(this) })
			);
		}
	}]);

	return ItemSetWidget;
})(React.Component);

exports['default'] = ItemSetWidget;
module.exports = exports['default'];

},{"../../download":22,"../../dragula/react-dragula":25,"../../share":28,"./championSelect":14,"./createBlock":15,"./itemBlocks":18,"./mapSelect":19,"./upload":20}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _itemButton = require('../../itemButton');

var _itemButton2 = _interopRequireDefault(_itemButton);

var ItemBlock = (function (_React$Component) {
	_inherits(ItemBlock, _React$Component);

	function ItemBlock() {
		_classCallCheck(this, ItemBlock);

		_get(Object.getPrototypeOf(ItemBlock.prototype), 'constructor', this).call(this);
		this.styles = {
			itemBlock: 'item-block',
			item_block_title: 'item-set-block-title',
			item_icon_block: 'item-set-button-block',
			item_icon_count: 'item-set-button-block-count'
		};
	}

	_createClass(ItemBlock, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.props.addDrag(this.refs.drag.getDOMNode());
		}
	}, {
		key: 'changeType',
		value: function changeType(id, idx, event) {
			console.log(id);
			this.props.handleBlockType(idx, event.target.value);
		}
	}, {
		key: 'onRemoveBlock',
		value: function onRemoveBlock(idx) {
			this.props.handleRemoveBlock(idx);
		}
	}, {
		key: 'renderItems',
		value: function renderItems(items) {
			var _this = this;

			return items.map(function (item, idx) {
				return React.createElement(
					'div',
					{ key: item.id + '-' + idx, className: _this.styles.item_icon_block },
					React.createElement(_itemButton2['default'], { itemId: item.id }),
					React.createElement(
						'span',
						{ className: _this.styles.item_icon_count },
						item.count
					)
				);
			});
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'row ' + this.styles.itemBlock },
				React.createElement(
					'div',
					{ className: 'row ' + this.styles.item_block_title },
					React.createElement(
						'div',
						{ className: 'col-xs-10 col-sm-10 col-md-10' },
						React.createElement(
							'div',
							{ className: 'input-group input-group-sm' },
							React.createElement('input', { className: 'form-control', type: 'text', value: this.props.block.type, onChange: this.changeType.bind(this, this.props.block.id, this.props.idx), placeholder: 'explain this item row' }),
							React.createElement(
								'div',
								{ className: 'input-group-addon' },
								React.createElement('span', { className: 'glyphicon glyphicon-pencil', 'aria-hidden': 'true' })
							)
						)
					),
					React.createElement(
						'div',
						{ className: 'col-xs-1 col-sm-1 col-md-1' },
						React.createElement('span', { className: 'glyphicon glyphicon-remove', onClick: this.onRemoveBlock.bind(this, this.props.idx) })
					)
				),
				React.createElement(
					'div',
					{ className: 'row' },
					React.createElement(
						'div',
						{ ref: 'drag', 'data-block-idx': this.props.idx, className: 'col-xs-12 col-sm-12 col-md-12 drag-container' },
						this.renderItems(this.props.block.items)
					)
				)
			);
		}
	}]);

	return ItemBlock;
})(React.Component);

exports['default'] = ItemBlock;
module.exports = exports['default'];

},{"../../itemButton":27}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _itemBlock = require('./itemBlock');

var _itemBlock2 = _interopRequireDefault(_itemBlock);

var ItemBlocks = (function (_React$Component) {
	_inherits(ItemBlocks, _React$Component);

	function ItemBlocks() {
		_classCallCheck(this, ItemBlocks);

		_get(Object.getPrototypeOf(ItemBlocks.prototype), 'constructor', this).call(this);
	}

	_createClass(ItemBlocks, [{
		key: 'render',
		value: function render() {
			var _this = this;

			var renderBlocks = this.props.blocks.map(function (block, idx) {
				return React.createElement(_itemBlock2['default'], { key: block.id + '-' + idx, block: block, idx: idx, addDrag: _this.props.addDrag, handleBlockType: _this.props.handleBlockType, handleRemoveBlock: _this.props.handleRemoveBlock });
			});

			return React.createElement(
				'div',
				null,
				renderBlocks
			);
		}
	}]);

	return ItemBlocks;
})(React.Component);

exports['default'] = ItemBlocks;
module.exports = exports['default'];

},{"./itemBlock":17}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MapSelect = (function (_React$Component) {
	_inherits(MapSelect, _React$Component);

	function MapSelect() {
		_classCallCheck(this, MapSelect);

		_get(Object.getPrototypeOf(MapSelect.prototype), 'constructor', this).call(this);
	}

	_createClass(MapSelect, [{
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'row' },
				'Pick for what maps here'
			);
		}
	}]);

	return MapSelect;
})(React.Component);

exports['default'] = MapSelect;
module.exports = exports['default'];

},{}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ItemSetUpload = (function (_React$Component) {
	_inherits(ItemSetUpload, _React$Component);

	function ItemSetUpload() {
		_classCallCheck(this, ItemSetUpload);

		_get(Object.getPrototypeOf(ItemSetUpload.prototype), 'constructor', this).call(this);

		this.styles = {
			errDisplay: 'upload-error'
		};

		this.handleUpload = this.handleUpload.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);

		this.clearErrTimer = 0;
		this.state = {
			error: ''
		};
	}

	_createClass(ItemSetUpload, [{
		key: 'validateParsed',
		value: function validateParsed(parsedJson) {
			// TODO validate
			// ...

			// once validated save to store
			appDispatcher.dispatch(APP_ACTIONS.upload_itemset(parsedJson));
		}
	}, {
		key: 'handleError',
		value: function handleError(err, filename) {
			var error = 'Unable to parse this file, it maybe not valid';
			switch (err.toString()) {
				case 'toobig':
					error = 'The file\'s size is too big and may not be valid';
					break;
			}

			this.setState({ error: filename + ': ' + error });
		}
	}, {
		key: 'clearError',
		value: function clearError() {
			if (this.clearErrTimer) {
				clearInterval(this.clearErrTimer);
			}
			this.setState({ error: '' });
		}
	}, {
		key: 'handleUpload',
		value: function handleUpload(event) {
			var that = this;
			var reader = new FileReader();
			var file = event.target.files[0];

			if (file.size > 15000) {
				this.handleError('toobig', file.name);
				return;
			}

			reader.onload = function (upload) {
				var parsed = undefined;
				var err = '';
				try {
					parsed = JSON.parse(upload.target.result);
				} catch (e) {
					err = e;
				}
				if (err || !parsed) {
					that.handleError(err, file.name);
				} else {
					that.validateParsed(parsed);
				}
				var el = React.findDOMNode(that.refs.inputElem);
				el.value = '';
			};
			reader.readAsText(file);
		}
	}, {
		key: 'handleSubmit',
		value: function handleSubmit(event) {
			event.preventDefault();
		}
	}, {
		key: 'render',
		value: function render() {
			// don't show the upload form if user already uploaded
			if (!this.props.show) {
				return null;
			}

			var error = undefined;
			// fade away errors
			if (this.state.error) {
				// if there's a previous timer, stop it first
				if (this.clearErrTimer) {
					clearInterval(this.clearErrTimer);
				}
				error = React.createElement(
					'span',
					{ className: this.styles.errDisplay, onClick: this.clearError.bind(this) },
					this.state.error
				);
				this.clearErrTimer = setTimeout(this.clearError.bind(this), 2500);
			}

			return React.createElement(
				'div',
				null,
				React.createElement(
					'form',
					{ onSubmit: this.handleSubmit, encType: 'multipart/form-data' },
					React.createElement('input', { ref: 'inputElem', type: 'file', accept: '.json', onChange: this.handleUpload })
				),
				error
			);
		}
	}]);

	return ItemSetUpload;
})(React.Component);

exports['default'] = ItemSetUpload;
module.exports = exports['default'];

},{}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SaveResult = (function (_React$Component) {
	_inherits(SaveResult, _React$Component);

	function SaveResult() {
		_classCallCheck(this, SaveResult);

		_get(Object.getPrototypeOf(SaveResult.prototype), 'constructor', this).call(this);
		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

			componentContainer: 'save-result-container',
			icon: 'save-result-icon',
			message: 'save-result-message',
			removeButton: 'save-result-button',
			green: 'font-green',
			red: 'font-red'
		};
	}

	_createClass(SaveResult, [{
		key: 'removePopup',
		value: function removePopup(buttonClick, event) {
			var remove = function remove() {
				appDispatcher.dispatch(APP_ACTIONS.got_save_status());
			};

			if (buttonClick.target) event = buttonClick;
			if (buttonClick === true) {
				remove();
			} else {
				if (event.target && event.target.className === this.styles.wrapper) {
					remove();
				}
			}
		}
	}, {
		key: 'render',
		value: function render() {
			var result = this.props.result;
			var message = '';

			var glyph = 'glyphicon glyphicon-remove';
			var color = this.styles.red;
			if (result.msg === 'ok') {
				color = this.styles.green;
				glyph = 'glyphicon glyphicon-ok';
				message = 'Your Item Build has been saved. Head over to Download to get it on your computer, or Share to show others your amazing build!';
			} else {
				message = 'Your Item Build is missing something, (more details to come)';
			}

			return React.createElement(
				'div',
				{ className: this.styles.wrapper, onClick: this.removePopup.bind(this, false) },
				React.createElement(
					'div',
					{ className: this.styles.container },
					React.createElement(
						'div',
						{ className: this.styles.componentContainer },
						React.createElement(
							'div',
							{ className: color + ' ' + this.styles.icon },
							React.createElement('span', { className: glyph })
						),
						React.createElement(
							'div',
							{ className: this.styles.message },
							message
						),
						React.createElement(
							'div',
							{ className: this.styles.removeButton },
							React.createElement(
								'button',
								{ onClick: this.removePopup.bind(this, true) },
								'Got it'
							)
						)
					)
				)
			);
		}
	}]);

	return SaveResult;
})(React.Component);

exports['default'] = SaveResult;
module.exports = exports['default'];

},{}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Download = (function (_React$Component) {
	_inherits(Download, _React$Component);

	function Download() {
		_classCallCheck(this, Download);

		_get(Object.getPrototypeOf(Download.prototype), 'constructor', this).call(this);
		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

			inputJson: 'inputJson'
		};
	}

	_createClass(Download, [{
		key: 'removeShow',
		value: function removeShow(buttonClick, event) {
			var remove = function remove() {
				appDispatcher.dispatch(APP_ACTIONS.app_hide_popup());
			};

			if (buttonClick.target) event = buttonClick;
			if (buttonClick === true) {
				remove();
			} else {
				if (event.target && event.target.className === this.styles.wrapper) {
					remove();
				}
			}
		}
	}, {
		key: 'renderDownload',
		value: function renderDownload(json) {
			return React.createElement(
				'div',
				{ className: 'row' },
				React.createElement(
					'h3',
					{ className: 'xfont-thin' },
					'Download'
				),
				React.createElement('hr', null),
				React.createElement(
					'p',
					null,
					'You can get this item build through two methods, one is by downloading it ',
					React.createElement(
						'a',
						{ href: '/download/' + this.props.id + '.json' },
						'here'
					),
					'.'
				),
				React.createElement(
					'p',
					null,
					'Or the other method is creating a file with the name:',
					React.createElement('br', null),
					React.createElement(
						'i',
						null,
						this.props.id,
						'.json'
					)
				),
				React.createElement(
					'p',
					null,
					'Then copy and paste the below code into the file and save.'
				),
				React.createElement('textarea', { readOnly: true, value: json, className: this.styles.inputJson }),
				React.createElement('hr', null),
				React.createElement(
					'p',
					null,
					'After you are done with either method, move the file into the appropriate champion folder where League Of Legends is installed.'
				)
			);
		}
	}, {
		key: 'renderErr',
		value: function renderErr(err) {
			return React.createElement(
				'div',
				{ className: 'row' },
				React.createElement(
					'h3',
					null,
					'There was an error'
				),
				React.createElement('hr', null),
				React.createElement(
					'p',
					null,
					'This is most likely a bug. Report it if possible (see About section).'
				),
				React.createElement(
					'p',
					null,
					'The specific error message is: ',
					err.toString()
				)
			);
		}
	}, {
		key: 'render',
		value: function render() {
			if (!this.props.show) {
				return null;
			}

			var json = undefined,
			    jsonErr = undefined;
			try {
				json = JSON.stringify(this.props.data);
			} catch (e) {
				jsonErr = e;
			}

			var message = undefined;
			if (jsonErr) {
				message = this.renderErr(jsonErr);
			} else {
				message = this.renderDownload(json);
			}

			return React.createElement(
				'div',
				{ className: this.styles.wrapper, onClick: this.removeShow.bind(this) },
				React.createElement(
					'div',
					{ className: this.styles.container },
					message
				)
			);
		}
	}]);

	return Download;
})(React.Component);

exports['default'] = Download;
module.exports = exports['default'];

},{}],23:[function(require,module,exports){
'use strict';

var cache = {};
var start = '(?:^|\\s)';
var end = '(?:\\s|$)';

function lookupClass(className) {
  var cached = cache[className];
  if (cached) {
    cached.lastIndex = 0;
  } else {
    cache[className] = cached = new RegExp(start + className + end, 'g');
  }
  return cached;
}

function addClass(el, className) {
  var current = el.className;
  if (!current.length) {
    el.className = className;
  } else if (!lookupClass(className).test(current)) {
    el.className += ' ' + className;
  }
}

function rmClass(el, className) {
  el.className = el.className.replace(lookupClass(className), ' ').trim();
}

module.exports = {
  add: addClass,
  rm: rmClass
};

},{}],24:[function(require,module,exports){
(function (global){
'use strict';

/*
  Modified L#367, https://github.com/bevacqua/dragula
 */

var emitter = require('contra/emitter');
var crossvent = require('crossvent');
var classes = require('./classes');

function dragula(initialContainers, options) {
  var len = arguments.length;
  if (len === 1 && Array.isArray(initialContainers) === false) {
    options = initialContainers;
    initialContainers = [];
  }
  var body = document.body;
  var documentElement = document.documentElement;
  var _mirror; // mirror image
  var _source; // source container
  var _item; // item being dragged
  var _offsetX; // reference x
  var _offsetY; // reference y
  var _initialSibling; // reference sibling when grabbed
  var _currentSibling; // reference sibling now
  var _copy; // item used for copying
  var _renderTimer; // timer for setTimeout renderMirrorImage
  var _lastDropTarget = null; // last container item was over
  var _grabbed; // holds mousedown context until first mousemove

  var o = options || {};
  if (o.moves === void 0) {
    o.moves = always;
  }
  if (o.accepts === void 0) {
    o.accepts = always;
  }
  if (o.invalid === void 0) {
    o.invalid = invalidTarget;
  }
  if (o.containers === void 0) {
    o.containers = initialContainers || [];
  }
  if (o.isContainer === void 0) {
    o.isContainer = never;
  }
  if (o.copy === void 0) {
    o.copy = false;
  }
  if (o.revertOnSpill === void 0) {
    o.revertOnSpill = false;
  }
  if (o.removeOnSpill === void 0) {
    o.removeOnSpill = false;
  }
  if (o.direction === void 0) {
    o.direction = 'vertical';
  }
  if (o.mirrorContainer === void 0) {
    o.mirrorContainer = body;
  }

  var drake = emitter({
    containers: o.containers,
    start: manualStart,
    end: end,
    cancel: cancel,
    remove: remove,
    destroy: destroy,
    dragging: false
  });

  if (o.removeOnSpill === true) {
    drake.on('over', spillOver).on('out', spillOut);
  }

  events();

  return drake;

  function isContainer(el) {
    return drake.containers.indexOf(el) !== -1 || o.isContainer(el);
  }

  function events(remove) {
    var op = remove ? 'remove' : 'add';
    touchy(documentElement, op, 'mousedown', grab);
    touchy(documentElement, op, 'mouseup', release);
  }

  function eventualMovements(remove) {
    var op = remove ? 'remove' : 'add';
    touchy(documentElement, op, 'mousemove', startBecauseMouseMoved);
  }

  function movements(remove) {
    var op = remove ? 'remove' : 'add';
    touchy(documentElement, op, 'selectstart', preventGrabbed); // IE8
    touchy(documentElement, op, 'click', preventGrabbed);
  }

  function destroy() {
    events(true);
    release({});
  }

  function preventGrabbed(e) {
    if (_grabbed) {
      e.preventDefault();
    }
  }

  function grab(e) {
    var ignore = e.which !== 0 && e.which !== 1 || e.metaKey || e.ctrlKey;
    if (ignore) {
      return; // we only care about honest-to-god left clicks and touch events
    }
    var item = e.target;
    var context = canStart(item);
    if (!context) {
      return;
    }
    _grabbed = context;
    eventualMovements();
    if (e.type === 'mousedown') {
      e.preventDefault(); // fixes https://github.com/bevacqua/dragula/issues/155
      if (item.tagName === 'INPUT' || item.tagName === 'TEXTAREA') {
        item.focus(); // fixes https://github.com/bevacqua/dragula/issues/176
      }
    }
  }

  function startBecauseMouseMoved(e) {
    eventualMovements(true);
    movements();
    end();
    start(_grabbed);

    var offset = getOffset(_item);
    _offsetX = getCoord('pageX', e) - offset.left;
    _offsetY = getCoord('pageY', e) - offset.top;

    classes.add(_copy || _item, 'gu-transit');
    renderMirrorImage();
    drag(e);
  }

  function canStart(item) {
    if (drake.dragging && _mirror) {
      return;
    }
    if (isContainer(item)) {
      return; // don't drag container itself
    }
    var handle = item;
    while (item.parentElement && isContainer(item.parentElement) === false) {
      if (o.invalid(item, handle)) {
        return;
      }
      item = item.parentElement; // drag target should be a top element
      if (!item) {
        return;
      }
    }
    var source = item.parentElement;
    if (!source) {
      return;
    }
    if (o.invalid(item, handle)) {
      return;
    }

    var movable = o.moves(item, source, handle);
    if (!movable) {
      return;
    }

    return {
      item: item,
      source: source
    };
  }

  function manualStart(item) {
    var context = canStart(item);
    if (context) {
      start(context);
    }
  }

  function start(context) {
    if (o.copy) {
      _copy = context.item.cloneNode(true);
      drake.emit('cloned', _copy, context.item, 'copy');
    }

    _source = context.source;
    _item = context.item;
    _initialSibling = _currentSibling = nextEl(context.item);

    drake.dragging = true;
    drake.emit('drag', _item, _source);
  }

  function invalidTarget() {
    return false;
  }

  function end() {
    if (!drake.dragging) {
      return;
    }
    var item = _copy || _item;
    drop(item, item.parentElement);
  }

  function ungrab() {
    _grabbed = false;
    eventualMovements(true);
    movements(true);
  }

  function release(e) {
    ungrab();

    if (!drake.dragging) {
      return;
    }
    var item = _copy || _item;
    var clientX = getCoord('clientX', e);
    var clientY = getCoord('clientY', e);
    var elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
    var dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
    if (dropTarget && (o.copy === false || dropTarget !== _source)) {
      drop(item, dropTarget);
    } else if (o.removeOnSpill) {
      remove();
    } else {
      cancel();
    }
  }

  function drop(item, target) {
    if (isInitialPlacement(target)) {
      drake.emit('cancel', item, _source);
    } else {
      drake.emit('drop', item, target, _source);
    }
    cleanup();
  }

  function remove() {
    if (!drake.dragging) {
      return;
    }
    var item = _copy || _item;
    var parent = item.parentElement;
    if (parent) {
      parent.removeChild(item);
    }
    drake.emit(o.copy ? 'cancel' : 'remove', item, parent);
    cleanup();
  }

  function cancel(revert) {
    if (!drake.dragging) {
      return;
    }
    var reverts = arguments.length > 0 ? revert : o.revertOnSpill;
    var item = _copy || _item;
    var parent = item.parentElement;
    if (parent === _source && o.copy) {
      parent.removeChild(_copy);
    }
    var initial = isInitialPlacement(parent);
    if (initial === false && o.copy === false && reverts) {
      _source.insertBefore(item, _initialSibling);
    }
    if (initial || reverts) {
      drake.emit('cancel', item, _source);
    } else {
      drake.emit('drop', item, parent, _source);
    }
    cleanup();
  }

  function cleanup() {
    var item = _copy || _item;
    ungrab();
    removeMirrorImage();
    if (item) {
      classes.rm(item, 'gu-transit');
    }
    if (_renderTimer) {
      clearTimeout(_renderTimer);
    }
    drake.dragging = false;
    drake.emit('out', item, _lastDropTarget, _source);
    drake.emit('dragend', item);
    _source = _item = _copy = _initialSibling = _currentSibling = _renderTimer = _lastDropTarget = null;
  }

  function isInitialPlacement(target, s) {
    var sibling;
    if (s !== void 0) {
      sibling = s;
    } else if (_mirror) {
      sibling = _currentSibling;
    } else {
      sibling = nextEl(_copy || _item);
    }
    return target === _source && sibling === _initialSibling;
  }

  function findDropTarget(elementBehindCursor, clientX, clientY) {
    var target = elementBehindCursor;
    while (target && !accepted()) {
      target = target.parentElement;
    }
    return target;

    function accepted() {
      var droppable = isContainer(target);
      if (droppable === false) {
        return false;
      }

      var immediate = getImmediateChild(target, elementBehindCursor);
      var reference = getReference(target, immediate, clientX, clientY);
      var initial = isInitialPlacement(target, reference);
      if (initial) {
        return true; // should always be able to drop it right back where it was
      }
      return o.accepts(_item, target, _source, reference);
    }
  }

  function drag(e) {
    if (!_mirror) {
      return;
    }
    e.preventDefault();

    var clientX = getCoord('clientX', e);
    var clientY = getCoord('clientY', e);
    var x = clientX - _offsetX;
    var y = clientY - _offsetY;

    _mirror.style.left = x + 'px';
    _mirror.style.top = y + 'px';

    var item = _copy || _item;
    var elementBehindCursor = getElementBehindPoint(_mirror, clientX, clientY);
    var dropTarget = findDropTarget(elementBehindCursor, clientX, clientY);
    var changed = dropTarget !== null && dropTarget !== _lastDropTarget;
    if (changed || dropTarget === null) {
      out();
      _lastDropTarget = dropTarget;
      over();
    }
    if (dropTarget === _source && o.copy) {
      if (item.parentElement) {
        item.parentElement.removeChild(item);
      }
      return;
    }
    var reference;
    var immediate = getImmediateChild(dropTarget, elementBehindCursor);
    if (immediate !== null) {
      reference = getReference(dropTarget, immediate, clientX, clientY);
    } else if (o.revertOnSpill === true && !o.copy) {
      reference = _initialSibling;
      dropTarget = _source;
    } else {
      if (o.copy && item.parentElement) {
        item.parentElement.removeChild(item);
      }
      return;
    }
    if (reference === null || reference !== item && reference !== nextEl(item) && reference !== _currentSibling) {
      _currentSibling = reference;
      //dropTarget.insertBefore(item, reference);
      drake.emit('shadow', item, dropTarget);
    }
    function moved(type) {
      drake.emit(type, item, _lastDropTarget, _source);
    }
    function over() {
      if (changed) {
        moved('over');
      }
    }
    function out() {
      if (_lastDropTarget) {
        moved('out');
      }
    }
  }

  function spillOver(el) {
    classes.rm(el, 'gu-hide');
  }

  function spillOut(el) {
    if (drake.dragging) {
      classes.add(el, 'gu-hide');
    }
  }

  function renderMirrorImage() {
    if (_mirror) {
      return;
    }
    var rect = _item.getBoundingClientRect();
    _mirror = _item.cloneNode(true);
    _mirror.style.width = getRectWidth(rect) + 'px';
    _mirror.style.height = getRectHeight(rect) + 'px';
    classes.rm(_mirror, 'gu-transit');
    classes.add(_mirror, 'gu-mirror');
    o.mirrorContainer.appendChild(_mirror);
    touchy(documentElement, 'add', 'mousemove', drag);
    classes.add(o.mirrorContainer, 'gu-unselectable');
    drake.emit('cloned', _mirror, _item, 'mirror');
  }

  function removeMirrorImage() {
    if (_mirror) {
      classes.rm(o.mirrorContainer, 'gu-unselectable');
      touchy(documentElement, 'remove', 'mousemove', drag);
      _mirror.parentElement.removeChild(_mirror);
      _mirror = null;
    }
  }

  function getImmediateChild(dropTarget, target) {
    var immediate = target;
    while (immediate !== dropTarget && immediate.parentElement !== dropTarget) {
      immediate = immediate.parentElement;
    }
    if (immediate === documentElement) {
      return null;
    }
    return immediate;
  }

  function getReference(dropTarget, target, x, y) {
    var horizontal = o.direction === 'horizontal';
    var reference = target !== dropTarget ? inside() : outside();
    return reference;

    function outside() {
      // slower, but able to figure out any position
      var len = dropTarget.children.length;
      var i;
      var el;
      var rect;
      for (i = 0; i < len; i++) {
        el = dropTarget.children[i];
        rect = el.getBoundingClientRect();
        if (horizontal && rect.left > x) {
          return el;
        }
        if (!horizontal && rect.top > y) {
          return el;
        }
      }
      return null;
    }

    function inside() {
      // faster, but only available if dropped inside a child element
      var rect = target.getBoundingClientRect();
      if (horizontal) {
        return resolve(x > rect.left + getRectWidth(rect) / 2);
      }
      return resolve(y > rect.top + getRectHeight(rect) / 2);
    }

    function resolve(after) {
      return after ? nextEl(target) : target;
    }
  }
}

function touchy(el, op, type, fn) {
  var touch = {
    mouseup: 'touchend',
    mousedown: 'touchstart',
    mousemove: 'touchmove'
  };
  var microsoft = {
    mouseup: 'MSPointerUp',
    mousedown: 'MSPointerDown',
    mousemove: 'MSPointerMove'
  };
  if (global.navigator.msPointerEnabled) {
    crossvent[op](el, microsoft[type], fn);
  }
  crossvent[op](el, touch[type], fn);
  crossvent[op](el, type, fn);
}

function getOffset(el) {
  var rect = el.getBoundingClientRect();
  return {
    left: rect.left + getScroll('scrollLeft', 'pageXOffset'),
    top: rect.top + getScroll('scrollTop', 'pageYOffset')
  };
}

function getScroll(scrollProp, offsetProp) {
  if (typeof global[offsetProp] !== 'undefined') {
    return global[offsetProp];
  }
  var documentElement = document.documentElement;
  if (documentElement.clientHeight) {
    return documentElement[scrollProp];
  }
  var body = document.body;
  return body[scrollProp];
}

function getElementBehindPoint(point, x, y) {
  var p = point || {};
  var state = p.className;
  var el;
  p.className += ' gu-hide';
  el = document.elementFromPoint(x, y);
  p.className = state;
  return el;
}

function never() {
  return false;
}
function always() {
  return true;
}

function nextEl(el) {
  return el.nextElementSibling || manually();
  function manually() {
    var sibling = el;
    do {
      sibling = sibling.nextSibling;
    } while (sibling && sibling.nodeType !== 1);
    return sibling;
  }
}

function getEventHost(e) {
  // on touchend event, we have to use `e.changedTouches`
  // see http://stackoverflow.com/questions/7192563/touchend-event-properties
  // see https://github.com/bevacqua/dragula/issues/34
  if (e.targetTouches && e.targetTouches.length) {
    return e.targetTouches[0];
  }
  if (e.changedTouches && e.changedTouches.length) {
    return e.changedTouches[0];
  }
  return e;
}

function getCoord(coord, e) {
  var host = getEventHost(e);
  var missMap = {
    pageX: 'clientX', // IE8
    pageY: 'clientY' // IE8
  };
  if (coord in missMap && !(coord in host) && missMap[coord] in host) {
    coord = missMap[coord];
  }
  return host[coord];
}

function getRectWidth(rect) {
  return rect.width || rect.right - rect.left;
}

function getRectHeight(rect) {
  return rect.height || rect.bottom - rect.top;
}

module.exports = dragula;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./classes":23,"contra/emitter":3,"crossvent":6}],25:[function(require,module,exports){
'use strict';

var dragula = require('./dragula');
var atoa = require('atoa');

function reactDragula() {
  return dragula.apply(this, atoa(arguments)).on('cloned', cloned);

  function cloned(clone) {
    rm(clone);
    atoa(clone.getElementsByTagName('*')).forEach(rm);
  }

  function rm(el) {
    el.removeAttribute('data-reactid');
  }
}

module.exports = reactDragula;

},{"./dragula":24,"atoa":1}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Info = (function (_React$Component) {
	_inherits(Info, _React$Component);

	function Info() {
		_classCallCheck(this, Info);

		_get(Object.getPrototypeOf(Info.prototype), 'constructor', this).call(this);

		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container'

		};
	}

	_createClass(Info, [{
		key: 'removeShow',
		value: function removeShow(buttonClick, event) {
			var remove = function remove() {
				appDispatcher.dispatch(APP_ACTIONS.app_hide_popup());
			};

			if (buttonClick.target) event = buttonClick;
			if (buttonClick === true) {
				remove();
			} else {
				if (event.target && event.target.className === this.styles.wrapper) {
					remove();
				}
			}
		}
	}, {
		key: 'render',
		value: function render() {
			if (!this.props.show) {
				return null;
			}

			return React.createElement(
				'div',
				{ className: this.styles.wrapper, onClick: this.removeShow.bind(this) },
				React.createElement(
					'div',
					{ className: this.styles.container },
					React.createElement(
						'div',
						null,
						React.createElement(
							'h3',
							null,
							'Item Builder'
						),
						React.createElement(
							'p',
							null,
							'This project is an open source project, you can view the code on ',
							React.createElement(
								'a',
								{ href: 'http://github.com/hnry/itembuilder', target: '_blank' },
								'GitHub'
							)
						),
						React.createElement(
							'p',
							null,
							'It was created as part of the Riot 2.0 API challenge.'
						)
					),
					React.createElement('br', null),
					React.createElement(
						'div',
						null,
						React.createElement(
							'small',
							null,
							'Item Builder isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.'
						)
					)
				)
			);
		}
	}]);

	return Info;
})(React.Component);

exports['default'] = Info;
module.exports = exports['default'];

},{}],27:[function(require,module,exports){
/*
	onHover and display Item icon image
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ItemButton = (function (_React$Component) {
	_inherits(ItemButton, _React$Component);

	function ItemButton() {
		_classCallCheck(this, ItemButton);

		_get(Object.getPrototypeOf(ItemButton.prototype), 'constructor', this).call(this);

		this.styles = {
			popupHide: 'item-pop-hide',
			popupShow: 'item-pop-show',
			popup: 'item-pop'
		};

		this.state = {
			popup: false,
			item: {}
		};

		this.token = 0;
	}

	_createClass(ItemButton, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var item = undefined;
			var that = this;

			this.token = ItemStore.notify(function () {
				if (that.props.item) {
					item = that.props.item;
				} else {
					item = ItemStore.getById(that.props.itemId);
				}
				that.setState({ item: item });
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			ItemStore.unnotify(this.token);
		}
	}, {
		key: 'handleHoverOn',
		value: function handleHoverOn() {
			//console.log(this.state.item);
			this.setState({ popup: true });
		}
	}, {
		key: 'handleHoverOff',
		value: function handleHoverOff() {
			this.setState({ popup: false });
		}
	}, {
		key: 'render',
		value: function render() {
			if (!this.state.item || Object.keys(this.state.item).length < 1) {
				return null;
			}

			var popUpDisplay = this.styles.popupHide;
			if (this.state.popup) popUpDisplay = this.styles.popupShow;

			return React.createElement(
				'div',
				{ 'data-item-id': this.state.item.id },
				React.createElement('img', { src: this.state.item.getImage(), onMouseEnter: this.handleHoverOn.bind(this), onMouseLeave: this.handleHoverOff.bind(this) }),
				React.createElement(
					'div',
					{ className: 'row ' + this.styles.popup + ' ' + popUpDisplay },
					this.state.item.name,
					React.createElement('br', null),
					this.state.item.description,
					React.createElement('br', null),
					this.state.item.gold.base,
					' ',
					React.createElement('img', { src: 'http://ddragon.leagueoflegends.com/cdn/5.5.1/img/ui/gold.png' })
				)
			);
		}
	}]);

	return ItemButton;
})(React.Component);

exports['default'] = ItemButton;
module.exports = exports['default'];

},{}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Share = (function (_React$Component) {
	_inherits(Share, _React$Component);

	function Share() {
		_classCallCheck(this, Share);

		_get(Object.getPrototypeOf(Share.prototype), 'constructor', this).call(this);

		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

			shareContainer: 'share-modal'
		};
	}

	_createClass(Share, [{
		key: 'removeShow',
		value: function removeShow(buttonClick, event) {
			var remove = function remove() {
				appDispatcher.dispatch(APP_ACTIONS.app_hide_popup());
			};

			if (buttonClick.target) event = buttonClick;
			if (buttonClick === true) {
				remove();
			} else {
				if (event.target && event.target.className === this.styles.wrapper) {
					remove();
				}
			}
		}
	}, {
		key: 'render',
		value: function render() {
			// TODO
			// if using HTML5 fallback (/#/)
			// this.context.router.makeHref returns #/
			// so have to prepend a '/' in this case
			var link = 'http://' + window.location.host + this.context.router.makeHref('view', { id: this.props.id });

			if (!this.props.show) {
				return null;
			}

			return React.createElement(
				'div',
				{ className: this.styles.wrapper, onClick: this.removeShow.bind(this) },
				React.createElement(
					'div',
					{ className: this.styles.container },
					React.createElement(
						'div',
						{ className: this.styles.shareContainer },
						React.createElement(
							'h3',
							{ className: 'xfont-thin' },
							'Share'
						),
						React.createElement('hr', null),
						'Share your item build with others using this link:',
						React.createElement('br', null),
						React.createElement('input', { type: 'text', defaultValue: link, readOnly: true }),
						React.createElement('br', null),
						React.createElement('br', null),
						'Or share it on your social media,'
					)
				)
			);
		}
	}]);

	return Share;
})(React.Component);

Share.contextTypes = {
	router: React.PropTypes.func
};

exports['default'] = Share;
module.exports = exports['default'];

},{}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _viewBuild = require('./viewBuild');

var _viewBuild2 = _interopRequireDefault(_viewBuild);

var _viewDisplay = require('./viewDisplay');

var _viewDisplay2 = _interopRequireDefault(_viewDisplay);

var _itemButton = require('../itemButton');

var _itemButton2 = _interopRequireDefault(_itemButton);

var _share = require('../share');

var _share2 = _interopRequireDefault(_share);

var _download = require('../download');

var _download2 = _interopRequireDefault(_download);

var _info = require('../info');

var _info2 = _interopRequireDefault(_info);

var View = (function (_React$Component) {
	_inherits(View, _React$Component);

	function View() {
		_classCallCheck(this, View);

		_get(Object.getPrototypeOf(View.prototype), 'constructor', this).call(this);

		this.styles = {};

		this.state = itemSetStore.getAll();
		this.state.app = appStore.getAll();

		this.tokenItemSetStore = 0;
		this.tokenAppStore = 0;
	}

	_createClass(View, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.tokenItemSetStore = itemSetStore.addListener(this._onChange.bind(this));
			this.tokenAppStore = appStore.addListener(this._onAppChange.bind(this));

			// TODO could do some quick ID validation
			// to detect obvious bad IDs and not bother loading..
			appDispatcher.dispatch(APP_ACTIONS.load_data(this.props.params.id));
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			itemSetStore.removeListener('', this.tokenItemSetStore);
			appStore.removeListener('', this.tokenAppStore);
		}
	}, {
		key: '_onChange',
		value: function _onChange() {
			var data = itemSetStore.getAll();
			this.setState(data);
		}
	}, {
		key: '_onAppChange',
		value: function _onAppChange() {
			var data = appStore.getAll();
			this.setState({ app: data });
		}
	}, {
		key: 'render',
		value: function render() {
			// have to check if resource exists
			// if not render something different TODO
			return React.createElement(
				'div',
				{ className: 'row' },
				React.createElement(_share2['default'], { id: this.state.id, show: this.state.app.showShare }),
				React.createElement(_download2['default'], { show: this.state.app.showDownload, data: this.state.itemset, id: this.state.id }),
				React.createElement(_info2['default'], { show: this.state.app.showInfo }),
				React.createElement(
					'div',
					{ className: 'col-xs-5 col-sm-5 col-md-5' },
					React.createElement(_viewDisplay2['default'], { itemset: this.state.itemset })
				),
				React.createElement(
					'div',
					{ className: 'col-xs-5 col-sm-5 col-md-5' },
					React.createElement(_viewBuild2['default'], { apiVersion: this.props.apiVersion, data: this.state })
				)
			);
		}
	}]);

	return View;
})(React.Component);

exports['default'] = View;
module.exports = exports['default'];

},{"../download":22,"../info":26,"../itemButton":27,"../share":28,"./viewBuild":30,"./viewDisplay":31}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ViewBuild = (function (_React$Component) {
	_inherits(ViewBuild, _React$Component);

	function ViewBuild() {
		_classCallCheck(this, ViewBuild);

		_get(Object.getPrototypeOf(ViewBuild.prototype), 'constructor', this).call(this);

		this.styles = {};
	}

	_createClass(ViewBuild, [{
		key: 'renderChampionImage',
		value: function renderChampionImage() {
			if (!this.props.data.champion.riotKey) {
				return null;
			}
			return React.createElement('img', { src: 'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.data.champion.riotKey + '.png' });
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				null,
				this.props.data.itemset.title,
				React.createElement('br', null),
				this.renderChampionImage(),
				this.props.data.champion.name,
				React.createElement('br', null),
				React.createElement('br', null),
				'map info'
			);
		}
	}]);

	return ViewBuild;
})(React.Component);

exports['default'] = ViewBuild;
module.exports = exports['default'];

},{}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _itemButton = require('../itemButton');

var _itemButton2 = _interopRequireDefault(_itemButton);

var ViewDisplay = (function (_React$Component) {
	_inherits(ViewDisplay, _React$Component);

	function ViewDisplay() {
		_classCallCheck(this, ViewDisplay);

		_get(Object.getPrototypeOf(ViewDisplay.prototype), 'constructor', this).call(this);

		this.styles = {
			wrapper: 'view-display',
			blockTitle: 'view-display-block-title xfont'

		};
	}

	_createClass(ViewDisplay, [{
		key: 'renderBlockItems',
		value: function renderBlockItems(items) {
			return items.map(function (item, idx) {
				return React.createElement(
					'div',
					{ key: item.id + '-' + idx },
					React.createElement(_itemButton2['default'], { itemId: item.id }),
					React.createElement(
						'span',
						null,
						item.count
					)
				);
			});
		}
	}, {
		key: 'renderBlocks',
		value: function renderBlocks() {
			var _this = this;

			return this.props.itemset.blocks.map(function (block, idx) {
				return React.createElement(
					'div',
					{ key: idx },
					React.createElement(
						'span',
						{ className: _this.styles.blockTitle },
						'-- ',
						block.type
					),
					React.createElement(
						'div',
						null,
						_this.renderBlockItems(block.items)
					)
				);
			});
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'row ' + this.styles.wrapper },
				this.renderBlocks()
			);
		}
	}]);

	return ViewDisplay;
})(React.Component);

exports['default'] = ViewDisplay;
module.exports = exports['default'];

},{"../itemButton":27}]},{},[8])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXRvYS9hdG9hLmpzIiwibm9kZV9tb2R1bGVzL2NvbnRyYS9kZWJvdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvZW1pdHRlci5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvbm9kZV9tb2R1bGVzL3RpY2t5L3RpY2t5LWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L25vZGVfbW9kdWxlcy9jdXN0b20tZXZlbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9jcm9zc3ZlbnQuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9ldmVudG1hcC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9hcHAuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2NyZWF0ZS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbURpc3BsYXkvaW5kZXguanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1EaXNwbGF5L2l0ZW1DYXRlZ29yaWVzLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2NyZWF0ZS9pdGVtRGlzcGxheS9pdGVtRGlzcGxheS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbURpc3BsYXkvaXRlbVNlYXJjaC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9jaGFtcGlvblNlbGVjdC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9jcmVhdGVCbG9jay5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9pbmRleC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9pdGVtQmxvY2suanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1TZXQvaXRlbUJsb2Nrcy5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9tYXBTZWxlY3QuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1TZXQvdXBsb2FkLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2NyZWF0ZS9zYXZlUmVzdWx0LmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2Rvd25sb2FkLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2RyYWd1bGEvY2xhc3Nlcy5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9kcmFndWxhL2RyYWd1bGEuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvZHJhZ3VsYS9yZWFjdC1kcmFndWxhLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2luZm8uanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvaXRlbUJ1dHRvbi5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9zaGFyZS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy92aWV3L3ZpZXcuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvdmlldy92aWV3QnVpbGQuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvdmlldy92aWV3RGlzcGxheS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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O01BQ0UsTUFBSyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO01BQzlCO0tBQ0QsQ0FDTDtJQUNGLENBQUMsQ0FBQztHQUNIOzs7U0FFSyxrQkFBRztBQUNSLFVBQ0M7O01BQUssU0FBUyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQUFBQztJQUMzQyxJQUFJLENBQUMsWUFBWSxFQUFFO0lBQ2YsQ0FDTDtHQUNGOzs7UUEzQ0ksV0FBVztHQUFTLEtBQUssQ0FBQyxTQUFTOztxQkErQzFCLFdBQVciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhdG9hIChhLCBuKSB7IHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhLCBuKTsgfVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGlja3kgPSByZXF1aXJlKCd0aWNreScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlYm91bmNlIChmbiwgYXJncywgY3R4KSB7XG4gIGlmICghZm4pIHsgcmV0dXJuOyB9XG4gIHRpY2t5KGZ1bmN0aW9uIHJ1biAoKSB7XG4gICAgZm4uYXBwbHkoY3R4IHx8IG51bGwsIGFyZ3MgfHwgW10pO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhdG9hID0gcmVxdWlyZSgnYXRvYScpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVtaXR0ZXIgKHRoaW5nLCBvcHRpb25zKSB7XG4gIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGV2dCA9IHt9O1xuICBpZiAodGhpbmcgPT09IHVuZGVmaW5lZCkgeyB0aGluZyA9IHt9OyB9XG4gIHRoaW5nLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgaWYgKCFldnRbdHlwZV0pIHtcbiAgICAgIGV2dFt0eXBlXSA9IFtmbl07XG4gICAgfSBlbHNlIHtcbiAgICAgIGV2dFt0eXBlXS5wdXNoKGZuKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5vbmNlID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgZm4uX29uY2UgPSB0cnVlOyAvLyB0aGluZy5vZmYoZm4pIHN0aWxsIHdvcmtzIVxuICAgIHRoaW5nLm9uKHR5cGUsIGZuKTtcbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAoYyA9PT0gMSkge1xuICAgICAgZGVsZXRlIGV2dFt0eXBlXTtcbiAgICB9IGVsc2UgaWYgKGMgPT09IDApIHtcbiAgICAgIGV2dCA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZXQgPSBldnRbdHlwZV07XG4gICAgICBpZiAoIWV0KSB7IHJldHVybiB0aGluZzsgfVxuICAgICAgZXQuc3BsaWNlKGV0LmluZGV4T2YoZm4pLCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5lbWl0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gYXRvYShhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGluZy5lbWl0dGVyU25hcHNob3QoYXJncy5zaGlmdCgpKS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfTtcbiAgdGhpbmcuZW1pdHRlclNuYXBzaG90ID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgZXQgPSAoZXZ0W3R5cGVdIHx8IFtdKS5zbGljZSgwKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhdG9hKGFyZ3VtZW50cyk7XG4gICAgICB2YXIgY3R4ID0gdGhpcyB8fCB0aGluZztcbiAgICAgIGlmICh0eXBlID09PSAnZXJyb3InICYmIG9wdHMudGhyb3dzICE9PSBmYWxzZSAmJiAhZXQubGVuZ3RoKSB7IHRocm93IGFyZ3MubGVuZ3RoID09PSAxID8gYXJnc1swXSA6IGFyZ3M7IH1cbiAgICAgIGV0LmZvckVhY2goZnVuY3Rpb24gZW1pdHRlciAobGlzdGVuKSB7XG4gICAgICAgIGlmIChvcHRzLmFzeW5jKSB7IGRlYm91bmNlKGxpc3RlbiwgYXJncywgY3R4KTsgfSBlbHNlIHsgbGlzdGVuLmFwcGx5KGN0eCwgYXJncyk7IH1cbiAgICAgICAgaWYgKGxpc3Rlbi5fb25jZSkgeyB0aGluZy5vZmYodHlwZSwgbGlzdGVuKTsgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpbmc7XG4gICAgfTtcbiAgfTtcbiAgcmV0dXJuIHRoaW5nO1xufTtcbiIsInZhciBzaSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicsIHRpY2s7XG5pZiAoc2kpIHtcbiAgdGljayA9IGZ1bmN0aW9uIChmbikgeyBzZXRJbW1lZGlhdGUoZm4pOyB9O1xufSBlbHNlIHtcbiAgdGljayA9IGZ1bmN0aW9uIChmbikgeyBzZXRUaW1lb3V0KGZuLCAwKTsgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0aWNrOyIsIlxudmFyIE5hdGl2ZUN1c3RvbUV2ZW50ID0gZ2xvYmFsLkN1c3RvbUV2ZW50O1xuXG5mdW5jdGlvbiB1c2VOYXRpdmUgKCkge1xuICB0cnkge1xuICAgIHZhciBwID0gbmV3IE5hdGl2ZUN1c3RvbUV2ZW50KCdjYXQnLCB7IGRldGFpbDogeyBmb286ICdiYXInIH0gfSk7XG4gICAgcmV0dXJuICAnY2F0JyA9PT0gcC50eXBlICYmICdiYXInID09PSBwLmRldGFpbC5mb287XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ3Jvc3MtYnJvd3NlciBgQ3VzdG9tRXZlbnRgIGNvbnN0cnVjdG9yLlxuICpcbiAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC5DdXN0b21FdmVudFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVzZU5hdGl2ZSgpID8gTmF0aXZlQ3VzdG9tRXZlbnQgOlxuXG4vLyBJRSA+PSA5XG4nZnVuY3Rpb24nID09PSB0eXBlb2YgZG9jdW1lbnQuY3JlYXRlRXZlbnQgPyBmdW5jdGlvbiBDdXN0b21FdmVudCAodHlwZSwgcGFyYW1zKSB7XG4gIHZhciBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gIGlmIChwYXJhbXMpIHtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICB9IGVsc2Uge1xuICAgIGUuaW5pdEN1c3RvbUV2ZW50KHR5cGUsIGZhbHNlLCBmYWxzZSwgdm9pZCAwKTtcbiAgfVxuICByZXR1cm4gZTtcbn0gOlxuXG4vLyBJRSA8PSA4XG5mdW5jdGlvbiBDdXN0b21FdmVudCAodHlwZSwgcGFyYW1zKSB7XG4gIHZhciBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgZS50eXBlID0gdHlwZTtcbiAgaWYgKHBhcmFtcykge1xuICAgIGUuYnViYmxlcyA9IEJvb2xlYW4ocGFyYW1zLmJ1YmJsZXMpO1xuICAgIGUuY2FuY2VsYWJsZSA9IEJvb2xlYW4ocGFyYW1zLmNhbmNlbGFibGUpO1xuICAgIGUuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgfSBlbHNlIHtcbiAgICBlLmJ1YmJsZXMgPSBmYWxzZTtcbiAgICBlLmNhbmNlbGFibGUgPSBmYWxzZTtcbiAgICBlLmRldGFpbCA9IHZvaWQgMDtcbiAgfVxuICByZXR1cm4gZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGN1c3RvbUV2ZW50ID0gcmVxdWlyZSgnY3VzdG9tLWV2ZW50Jyk7XG52YXIgZXZlbnRtYXAgPSByZXF1aXJlKCcuL2V2ZW50bWFwJyk7XG52YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xudmFyIGFkZEV2ZW50ID0gYWRkRXZlbnRFYXN5O1xudmFyIHJlbW92ZUV2ZW50ID0gcmVtb3ZlRXZlbnRFYXN5O1xudmFyIGhhcmRDYWNoZSA9IFtdO1xuXG5pZiAoIWdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gIGFkZEV2ZW50ID0gYWRkRXZlbnRIYXJkO1xuICByZW1vdmVFdmVudCA9IHJlbW92ZUV2ZW50SGFyZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFkZDogYWRkRXZlbnQsXG4gIHJlbW92ZTogcmVtb3ZlRXZlbnQsXG4gIGZhYnJpY2F0ZTogZmFicmljYXRlRXZlbnRcbn07XG5cbmZ1bmN0aW9uIGFkZEV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBlbC5hdHRhY2hFdmVudCgnb24nICsgdHlwZSwgd3JhcChlbCwgdHlwZSwgZm4pKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRFYXN5IChlbCwgdHlwZSwgZm4sIGNhcHR1cmluZykge1xuICByZXR1cm4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgY2FwdHVyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRIYXJkIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGxpc3RlbmVyID0gdW53cmFwKGVsLCB0eXBlLCBmbik7XG4gIGlmIChsaXN0ZW5lcikge1xuICAgIHJldHVybiBlbC5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZhYnJpY2F0ZUV2ZW50IChlbCwgdHlwZSwgbW9kZWwpIHtcbiAgdmFyIGUgPSBldmVudG1hcC5pbmRleE9mKHR5cGUpID09PSAtMSA/IG1ha2VDdXN0b21FdmVudCgpIDogbWFrZUNsYXNzaWNFdmVudCgpO1xuICBpZiAoZWwuZGlzcGF0Y2hFdmVudCkge1xuICAgIGVsLmRpc3BhdGNoRXZlbnQoZSk7XG4gIH0gZWxzZSB7XG4gICAgZWwuZmlyZUV2ZW50KCdvbicgKyB0eXBlLCBlKTtcbiAgfVxuICBmdW5jdGlvbiBtYWtlQ2xhc3NpY0V2ZW50ICgpIHtcbiAgICB2YXIgZTtcbiAgICBpZiAoZG9jLmNyZWF0ZUV2ZW50KSB7XG4gICAgICBlID0gZG9jLmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgZS5pbml0RXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChkb2MuY3JlYXRlRXZlbnRPYmplY3QpIHtcbiAgICAgIGUgPSBkb2MuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGU7XG4gIH1cbiAgZnVuY3Rpb24gbWFrZUN1c3RvbUV2ZW50ICgpIHtcbiAgICByZXR1cm4gbmV3IGN1c3RvbUV2ZW50KHR5cGUsIHsgZGV0YWlsOiBtb2RlbCB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3cmFwcGVyRmFjdG9yeSAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwcGVyIChvcmlnaW5hbEV2ZW50KSB7XG4gICAgdmFyIGUgPSBvcmlnaW5hbEV2ZW50IHx8IGdsb2JhbC5ldmVudDtcbiAgICBlLnRhcmdldCA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICBlLnByZXZlbnREZWZhdWx0ID0gZS5wcmV2ZW50RGVmYXVsdCB8fCBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdCAoKSB7IGUucmV0dXJuVmFsdWUgPSBmYWxzZTsgfTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IGZ1bmN0aW9uIHN0b3BQcm9wYWdhdGlvbiAoKSB7IGUuY2FuY2VsQnViYmxlID0gdHJ1ZTsgfTtcbiAgICBlLndoaWNoID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG4gICAgZm4uY2FsbChlbCwgZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHdyYXAgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgd3JhcHBlciA9IHVud3JhcChlbCwgdHlwZSwgZm4pIHx8IHdyYXBwZXJGYWN0b3J5KGVsLCB0eXBlLCBmbik7XG4gIGhhcmRDYWNoZS5wdXNoKHtcbiAgICB3cmFwcGVyOiB3cmFwcGVyLFxuICAgIGVsZW1lbnQ6IGVsLFxuICAgIHR5cGU6IHR5cGUsXG4gICAgZm46IGZuXG4gIH0pO1xuICByZXR1cm4gd3JhcHBlcjtcbn1cblxuZnVuY3Rpb24gdW53cmFwIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGkgPSBmaW5kKGVsLCB0eXBlLCBmbik7XG4gIGlmIChpKSB7XG4gICAgdmFyIHdyYXBwZXIgPSBoYXJkQ2FjaGVbaV0ud3JhcHBlcjtcbiAgICBoYXJkQ2FjaGUuc3BsaWNlKGksIDEpOyAvLyBmcmVlIHVwIGEgdGFkIG9mIG1lbW9yeVxuICAgIHJldHVybiB3cmFwcGVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmQgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgaSwgaXRlbTtcbiAgZm9yIChpID0gMDsgaSA8IGhhcmRDYWNoZS5sZW5ndGg7IGkrKykge1xuICAgIGl0ZW0gPSBoYXJkQ2FjaGVbaV07XG4gICAgaWYgKGl0ZW0uZWxlbWVudCA9PT0gZWwgJiYgaXRlbS50eXBlID09PSB0eXBlICYmIGl0ZW0uZm4gPT09IGZuKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGV2ZW50bWFwID0gW107XG52YXIgZXZlbnRuYW1lID0gJyc7XG52YXIgcm9uID0gL15vbi87XG5cbmZvciAoZXZlbnRuYW1lIGluIGdsb2JhbCkge1xuICBpZiAocm9uLnRlc3QoZXZlbnRuYW1lKSkge1xuICAgIGV2ZW50bWFwLnB1c2goZXZlbnRuYW1lLnNsaWNlKDIpKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV2ZW50bWFwO1xuIiwidmFyIFJvdXRlciA9IHdpbmRvdy5SZWFjdFJvdXRlcjtcbnZhciBEZWZhdWx0Um91dGUgPSBSb3V0ZXIuRGVmYXVsdFJvdXRlO1xudmFyIFJvdXRlID0gUm91dGVyLlJvdXRlO1xudmFyIFJvdXRlSGFuZGxlciA9IFJvdXRlci5Sb3V0ZUhhbmRsZXI7XG52YXIgTGluayA9IFJvdXRlci5MaW5rO1xuXG5pbXBvcnQgQ3JlYXRlIGZyb20gJy4vY3JlYXRlL2NyZWF0ZSc7XG5pbXBvcnQgVmlldyBmcm9tICcuL3ZpZXcvdmlldyc7XG5cbnZhciBBcHAgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cblx0c3R5bGVzOiB7XG5cdFx0ZGlzYWJsZU5hdjogJ2Rpc2FibGUnXG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRjb25zdCBpbml0SUQgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpVmVyc2lvbjogJzUuMTYuMScsXG5cdFx0XHRpZDogaW5pdElELmlkLFxuXHRcdH07XG5cdH0sXG5cblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIGdldHMgYWxlcnRlZCBvbiBldmVyeSBzYXZlIGF0dGVtcHQsIGV2ZW4gZm9yIGZhaWwgc2F2ZXNcblx0XHRpdGVtU2V0U3RvcmUuYWRkTGlzdGVuZXIoJ3NhdmVTdGF0dXMnLCB0aGlzLl9vbkNoYW5nZSk7XG5cdH0sXG5cblx0X29uQ2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRjb25zdCBkYXRhID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBpZDogZGF0YS5pZCB9KTtcblx0fSxcblxuXHRtaXhpbnM6IFtSb3V0ZXIuU3RhdGVdLFxuXG5cdF9vbk5hdlNhdmU6IGZ1bmN0aW9uKGUpIHtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnNhdmVfaXRlbXNldCgpKTtcblx0fSxcblxuXHRfb25OYXZEb3dubG9hZDogZnVuY3Rpb24oZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5zaG93X2Rvd25sb2FkKCkpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRfb25OYXZTaGFyZTogZnVuY3Rpb24oZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5zaG93X3NoYXJlKCkpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRfb25OYXZJbmZvOiBmdW5jdGlvbihlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnNob3dfaW5mbygpKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblxuXHRyZW5kZXJMaW5rczogZnVuY3Rpb24obGluaywgZ2x5cGgsIG5hbWUpIHtcdFx0XHRcblx0XHQvKlxuXHRcdFx0VGhlIG1vZGUgd2UgYXJlIGluIGRlcGVuZHMgb24gaWYgd2UgaGF2ZSBkb2N1bWVudCBJRCBmb3IgYW4gaXRlbXNldFxuXHRcdFx0RGlmZmVyZW50IGxpbmtzIGZvciBkaWZmZXJlbnQgbW9kZXNcblx0XHRcdFRoZXJlIGlzIGEgdmlldyBtb2RlXG5cdFx0XHRBbmQgYSBjcmVhdGUgbW9kZVxuXHRcdCAqL1xuXHRcdGNvbnN0IGlkID0gdGhpcy5zdGF0ZS5pZDtcblxuXHRcdGNvbnN0IHZpZXdMaW5rcyA9IFtcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgZ2x5cGg6ICdnbHlwaGljb24tZmlsZScsIHRleHQ6ICdOZXcnIH0sXG5cdFx0XHR7IHVybDogJ2VkaXQnLCBwYXJhbXM6IGlkLCBnbHlwaDogJ2dseXBoaWNvbi1wZW5jaWwnLCB0ZXh0OiAnRWRpdCcgfSxcdFx0XHRcblx0XHRcdHsgdXJsOiAndmlldycsIHBhcmFtczogaWQsIG9uQ2xpY2s6IHRoaXMuX29uTmF2RG93bmxvYWQsIGdseXBoOiAnZ2x5cGhpY29uLXNhdmUnLCB0ZXh0OiAnRG93bmxvYWQnIH0sXG5cdFx0XHR7IHVybDogJ3ZpZXcnLCBwYXJhbXM6IGlkLCBvbkNsaWNrOiB0aGlzLl9vbk5hdlNoYXJlLCBnbHlwaDogJ2dseXBoaWNvbi1zaGFyZScsIHRleHQ6ICdTaGFyZScgfSxcblx0XHRcdHsgdXJsOiAndmlldycsIHBhcmFtczogaWQsIG9uQ2xpY2s6IHRoaXMuX29uTmF2SW5mbywgZ2x5cGg6ICdnbHlwaGljb24tZXF1YWxpemVyJywgdGV4dDogJ0Fib3V0JyB9LFxuXHRcdF07XG5cdFx0bGV0IGNyZWF0ZUxpbmtzID0gW1xuXHRcdFx0eyB1cmw6ICdjcmVhdGUnLCBnbHlwaDogJ2dseXBoaWNvbi1maWxlJywgdGV4dDogJ05ldycgfSxcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgb25DbGljazogdGhpcy5fb25OYXZTYXZlLCBnbHlwaDogJ2dseXBoaWNvbi1vaycsIHRleHQ6ICdTYXZlJyB9LFxuXHRcdFx0Ly8gdGhlIHJlc3Qgb2YgdGhlc2UgbGlua3Mgb25seSBhdmFpbGFibGUgaWYgc2F2ZWRcblx0XHRcdHsgdXJsOiAndmlldycsIHBhcmFtczogaWQsIGdseXBoOiAnZ2x5cGhpY29uLXVuY2hlY2tlZCcsIHRleHQ6ICdWaWV3JywgbmVlZElEOiB0cnVlIH0sXG5cdFx0XHR7IHVybDogJ2NyZWF0ZScsIG9uQ2xpY2s6IHRoaXMuX29uTmF2RG93bmxvYWQsIGdseXBoOiAnZ2x5cGhpY29uLXNhdmUnLCB0ZXh0OiAnRG93bmxvYWQnLCBuZWVkSUQ6IHRydWUgfSxcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgb25DbGljazogdGhpcy5fb25OYXZTaGFyZSwgZ2x5cGg6ICdnbHlwaGljb24tc2hhcmUnLCB0ZXh0OiAnU2hhcmUnLCBuZWVkSUQ6IHRydWUgfSxcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgb25DbGljazogdGhpcy5fb25OYXZJbmZvLCBnbHlwaDogJ2dseXBoaWNvbi1lcXVhbGl6ZXInLCB0ZXh0OiAnQWJvdXQnIH0sXG5cdFx0XTtcblxuXHRcdGxldCBtb2RlID0gY3JlYXRlTGlua3M7XG5cdFx0aWYgKHRoaXMuaXNBY3RpdmUoJ3ZpZXcnKSkge1xuXHRcdFx0bW9kZSA9IHZpZXdMaW5rcztcblx0XHR9XG5cblx0XHRyZXR1cm4gbW9kZS5tYXAobGluayA9PiB7XG5cdFx0XHRjb25zdCBpbm5lciA9IChcblx0XHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdzaWRlYmFyLWljb24nPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPXsnZ2x5cGhpY29uICcgKyBsaW5rLmdseXBofT48L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PHNwYW4+e2xpbmsudGV4dH08L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXG5cdFx0XHRsZXQgcjtcblxuXHRcdFx0Ly8gZGlzYWJsZSBjZXJ0YWluIG1lbnUgb3B0aW9ucyB3aGVuIHdlIGRvbid0XG5cdFx0XHQvLyBoYXZlIGFuIElEXG5cdFx0XHRpZiAobGluay5uZWVkSUQgJiYgIXRoaXMuc3RhdGUuaWQpIHtcblx0XHRcdFx0XHRyID0gKFxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmRpc2FibGVOYXZ9PlxuXHRcdFx0XHRcdFx0e2lubmVyfVxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChsaW5rWydvbkNsaWNrJ10pIHtcblx0XHRcdFx0XHRyID0gKDxMaW5rIHRvPXtsaW5rLnVybH0gcGFyYW1zPXt7aWQ6IGxpbmsucGFyYW1zfX0gb25DbGljaz17bGlua1snb25DbGljayddfT57aW5uZXJ9PC9MaW5rPik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyID0gKDxMaW5rIHRvPXtsaW5rLnVybH0gcGFyYW1zPXt7aWQ6IGxpbmsucGFyYW1zfX0+e2lubmVyfTwvTGluaz4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtsaW5rLnRleHQgKyAobGluay5wYXJhbXMgfHwgJycpfSBjbGFzc05hbWU9J3NpZGViYXItbGluayc+XG5cdFx0XHRcdFx0e3J9XG5cdFx0XHRcdDwvZGl2Plx0XHRcdFxuXHRcdFx0KTtcblx0XHR9KTtcblx0fSxcblx0XG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2PlxuXHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy0yIGNvbC1tZC0yIHNpZGViYXInPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nc2lkZWJhci1sb2dvJz5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9J3NpZGViYXItbGluay10ZXh0IHhmb250LXRoaW4nPkl0ZW0gQnVpbGRlcjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcblx0XHRcdFx0e3RoaXMucmVuZGVyTGlua3MoKX1cblx0XHRcdDwvZGl2PlxuXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTkgY29sLW1kLTkgY29sLXhzLW9mZnNldC0xIGNvbC1tZC1vZmZzZXQtMSBjb250ZW50Jz5cblx0XHRcdFx0PFJvdXRlSGFuZGxlciBhcGlWZXJzaW9uPXt0aGlzLnN0YXRlLmFwaVZlcnNpb259IC8+XG5cdFx0XHQ8L2Rpdj5cblxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufSk7XG5cblxudmFyIHJvdXRlcyA9IChcblx0PFJvdXRlIG5hbWU9J2FwcCcgcGF0aD0nLycgaGFuZGxlcj17QXBwfT5cblx0XHQ8Um91dGUgbmFtZT0nY3JlYXRlJyBoYW5kbGVyPXtDcmVhdGV9IC8+XG5cdFx0PFJvdXRlIG5hbWU9J3ZpZXcnIHBhdGg9XCJ2aWV3LzppZFwiIGhhbmRsZXI9e1ZpZXd9IC8+XG5cdFx0PFJvdXRlIG5hbWU9J2VkaXQnIHBhdGg9XCJlZGl0LzppZFwiIGhhbmRsZXI9e0NyZWF0ZX0gLz5cblx0XHQ8RGVmYXVsdFJvdXRlIGhhbmRsZXI9e0NyZWF0ZX0gLz5cblx0PC9Sb3V0ZT5cbik7XG5cblJvdXRlci5ydW4ocm91dGVzLCBSb3V0ZXIuSGlzdG9yeUxvY2F0aW9uLCBmdW5jdGlvbihIYW5kbGVyKSB7XG5cdFJlYWN0LnJlbmRlcig8SGFuZGxlciAvPiwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBBcHA7IiwiaW1wb3J0IEl0ZW1EaXNwbGF5V2lkZ2V0IGZyb20gJy4vaXRlbURpc3BsYXkvaW5kZXgnO1xuaW1wb3J0IEl0ZW1TZXRXaWRnZXQgZnJvbSAnLi9pdGVtU2V0L2luZGV4JztcbmltcG9ydCBTYXZlUmVzdWx0IGZyb20gJy4vc2F2ZVJlc3VsdCc7XG5pbXBvcnQgSW5mbyBmcm9tICcuLi9pbmZvJztcblxuY2xhc3MgQ3JlYXRlIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHQvKlxuXHRcdFx0Y2hhbXBTZWxlY3RXcmFwOiAnaXRlbS1jaGFtcC1zZWxlY3Qtd3JhcCcsXG5cdFx0XHRjaGFtcFNlbGVjdDogJ2l0ZW0tY2hhbXAtc2VsZWN0Jyxcblx0XHRcdGNoYW1waW9uU2VsZWN0QmxvY2s6ICdpdGVtLWNoYW1wLXNlbGVjdC1ibG9jaydcblx0XHRcdCovXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKClcblx0XHR0aGlzLnN0YXRlLmFwcCA9IGFwcFN0b3JlLmdldEFsbCgpO1xuXG5cdFx0dGhpcy50b2tlbkNoYW1waW9uID0gMDtcblx0XHR0aGlzLnRva2VuU2F2ZVN0YXR1cyA9IDA7XG5cdFx0dGhpcy50b2tlbkl0ZW1TdG9yZSA9IDA7XG5cdFx0dGhpcy50b2tlbkFwcFN0b3JlID0gMDtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXG5cdFx0dGhpcy50b2tlbkl0ZW1TdG9yZSA9IEl0ZW1TdG9yZS5ub3RpZnkoZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGF0LnNldFN0YXRlKHsgaXRlbXM6IEl0ZW1TdG9yZS5pdGVtcyB9KTtcblx0XHR9KTtcblxuXG5cdFx0dGhpcy50b2tlbkNoYW1waW9uID0gaXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKCdjaGFtcGlvbicsIHRoaXMuX29uQ2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdHRoaXMudG9rZW5TYXZlU3RhdHVzID0gaXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKCdzYXZlU3RhdHVzJywgdGhpcy5fb25DaGFuZ2UuYmluZCh0aGlzKSk7XG5cblxuXHRcdHRoaXMudG9rZW5BcHBTdG9yZSA9IGFwcFN0b3JlLmFkZExpc3RlbmVyKHRoaXMuX29uQXBwQ2hhbmdlLmJpbmQodGhpcykpO1xuXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgZ2V0IGFuIElELCB3ZSByZXNldCB0aGUgaXRlbSBzZXQgc3RvcmUgc3RhdGVcblx0XHQvLyBpZiB3ZSBnZXQgYW4gSUQgaXQgbWVhbnMgaXQncyAvZWRpdCB3aGljaCB0aGUgc3RvcmUgbmVlZHMgdG8gbG9hZFxuXHRcdGlmICh0aGlzLnByb3BzLnBhcmFtcyAmJiB0aGlzLnByb3BzLnBhcmFtcy5pZCkge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5sb2FkX2RhdGEodGhpcy5wcm9wcy5wYXJhbXMuaWQpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5yZXNldF9hbGwoKSk7XG5cdFx0fVxuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0SXRlbVN0b3JlLnVubm90aWZ5KHRoaXMudG9rZW5JdGVtU3RvcmUpO1xuXHRcdGl0ZW1TZXRTdG9yZS5yZW1vdmVMaXN0ZW5lcignY2hhbXBpb24nLCB0aGlzLnRva2VuQ2hhbXBpb24pO1xuXHRcdGl0ZW1TZXRTdG9yZS5yZW1vdmVMaXN0ZW5lcignc2F2ZVN0YXR1cycsIHRoaXMudG9rZW5TYXZlU3RhdHVzKTtcblx0XHRhcHBTdG9yZS5yZW1vdmVMaXN0ZW5lcignJywgdGhpcy50b2tlbkFwcFN0b3JlKTtcblx0fVxuXG5cdF9vbkNoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBjaGFtcGlvbjogZGF0YS5jaGFtcGlvbiwgc2F2ZVN0YXR1czogZGF0YS5zYXZlU3RhdHVzIH0pO1xuXHR9XG5cblx0X29uQXBwQ2hhbmdlKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBhcHBTdG9yZS5nZXRBbGwoKTtcblx0XHR0aGlzLnNldFN0YXRlKHsgYXBwOiBkYXRhIH0pO1x0XHRcblx0fVxuXG5cdG9uQ2hhbXBpb25TZWxlY3QoY2hhbXBpb25PYmopIHtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmNoYW1waW9uX3VwZGF0ZShjaGFtcGlvbk9iaikpO1xuXHR9XG5cblx0c2F2ZVBvcFVwKCkge1xuXHRcdGlmICh0aGlzLnN0YXRlLnNhdmVTdGF0dXMpIHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxTYXZlUmVzdWx0IHJlc3VsdD17dGhpcy5zdGF0ZS5zYXZlU3RhdHVzfSAvPlxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcdFx0XHRcblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHR7dGhpcy5zYXZlUG9wVXAoKX1cblx0XHRcdFx0PEluZm8gc2hvdz17dGhpcy5zdGF0ZS5hcHAuc2hvd0luZm99IC8+XG5cblx0XHRcdFx0PEl0ZW1EaXNwbGF5V2lkZ2V0IGl0ZW1zPXt0aGlzLnN0YXRlLml0ZW1zfSAvPlxuXHRcdFx0XHQ8SXRlbVNldFdpZGdldCBhcGlWZXJzaW9uPXt0aGlzLnByb3BzLmFwaVZlcnNpb259ICBjaGFtcGlvbj17dGhpcy5zdGF0ZS5jaGFtcGlvbn0gc2hvd0Rvd25sb2FkPXt0aGlzLnN0YXRlLmFwcC5zaG93RG93bmxvYWR9IHNob3dTaGFyZT17dGhpcy5zdGF0ZS5hcHAuc2hvd1NoYXJlfSBoYW5kbGVDaGFtcGlvblNlbGVjdD17dGhpcy5vbkNoYW1waW9uU2VsZWN0LmJpbmQodGhpcyl9IC8+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ3JlYXRlO1xuIiwiaW1wb3J0IEl0ZW1DYXRlZ29yaWVzIGZyb20gJy4vaXRlbUNhdGVnb3JpZXMnO1xuaW1wb3J0IEl0ZW1EaXNwbGF5IGZyb20gJy4vaXRlbURpc3BsYXknO1xuaW1wb3J0IEl0ZW1TZWFyY2ggZnJvbSAnLi9pdGVtU2VhcmNoJztcblxuY29uc3QgZ2V0QmFzZUNhdGVnb3JpZXMgPSBmdW5jdGlvbigpIHtcblx0Y29uc3QgYmFzZUNhdGVnb3JpZXMgPSB7XG5cdFx0XHRcdCdBbGwgSXRlbXMnOiBbXSxcblx0XHRcdFx0J1N0YXJ0aW5nIEl0ZW1zJzogW1xuXHRcdFx0XHRcdHsgbmFtZTogJ0p1bmdsZScsIHRhZ3M6IFsnSnVuZ2xlJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0xhbmUnLCB0YWdzOiBbJ0xhbmUnXSwgY2hlY2tlZDogZmFsc2UgfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHQnVG9vbHMnOiBbXG5cdFx0XHRcdFx0eyBuYW1lOiAnQ29uc3VtYWJsZScsIHRhZ3M6IFsnQ29uc3VtYWJsZSddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdHb2xkIEluY29tZScsIHRhZ3M6IFsnR29sZFBlciddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdWaXNpb24gJiBUcmlua2V0cycsIHRhZ3M6IFsnVmlzaW9uJywgJ1RyaW5rZXQnXSwgY2hlY2tlZDogZmFsc2UgfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHQnRGVmZW5zZSc6IFtcblx0XHRcdFx0XHR7IG5hbWU6ICdBcm1vcicsIHRhZ3M6IFsnQXJtb3InXSwgY2hlY2tlZDogZmFsc2UgfSxcblx0XHRcdFx0XHR7IG5hbWU6ICdIZWFsdGgnLCB0YWdzOiBbJ0hlYWx0aCddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdIZWFsdGggUmVnZW4nLCB0YWdzOiBbJ0hlYWx0aFJlZ2VuJ10sIGNoZWNrZWQ6IGZhbHNlIH1cblx0XHRcdFx0XSxcblx0XHRcdFx0J0F0dGFjayc6IFtcblx0XHRcdFx0XHR7IG5hbWU6ICdBdHRhY2sgU3BlZWQnLCB0YWdzOiBbJ0F0dGFja1NwZWVkJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0NyaXRpY2FsIFN0cmlrZScsIHRhZ3M6IFsnQ3JpdGljYWxTdHJpa2UnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnRGFtYWdlJywgdGFnczogWydEYW1hZ2UnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnTGlmZSBTdGVhbCcsIHRhZ3M6IFsnTGlmZVN0ZWFsJywgJ1NwZWxsVmFtcCddLCBjaGVja2VkOiBmYWxzZSB9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdCdNYWdpYyc6IFtcblx0XHRcdFx0XHR7IG5hbWU6ICdDb29sZG93biBSZWR1Y3Rpb24nLCB0YWdzOiBbJ0Nvb2xkb3duUmVkdWN0aW9uJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ01hbmEnLCB0YWdzOiBbJ01hbmEnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnTWFuYSBSZWdlbicsIHRhZ3M6IFsnTWFuYVJlZ2VuJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0FiaWxpdHkgUG93ZXInLCB0YWdzOiBbJ1NwZWxsRGFtYWdlJ10sIGNoZWNrZWQ6IGZhbHNlIH1cblx0XHRcdFx0XSxcblx0XHRcdFx0J01vdmVtZW50JzogW1xuXHRcdFx0XHRcdHsgbmFtZTogJ0Jvb3RzJywgdGFnczogWydCb290cyddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdPdGhlciBNb3ZlbWVudCcsIHRhZ3M6IFsnTm9uYm9vdHNNb3ZlbWVudCddLCBjaGVja2VkOiBmYWxzZSB9XG5cdFx0XHRcdF1cblx0fTtcblx0cmV0dXJuIGJhc2VDYXRlZ29yaWVzO1xufVxuXG5jbGFzcyBJdGVtRGlzcGxheVdpZGdldCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGl0ZW1EaXNwbGF5V3JhcHBlcjogJyBpdGVtLWRpc3BsYXktYm94LXdyYXAnLFxuXHRcdH07XG5cblx0XHR0aGlzLnN0YXRlID0geyBjYXRlZ29yaWVzOiBnZXRCYXNlQ2F0ZWdvcmllcygpLCBzZWFyY2g6ICcnfTtcblx0fVxuXG5cdGNoYW5nZUNhdGVnb3JpZXMoY2F0ZWdvcnlOYW1lLCBzdWJDYXRlZ29yeSkge1xuXHRcdGxldCBjYXRzID0gW107XG5cdFx0bGV0IGNhdGVnb3JpZXMgPSB0aGlzLnN0YXRlLmNhdGVnb3JpZXM7XG5cblx0XHRpZiAodHlwZW9mIHN1YkNhdGVnb3J5ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0Ly8gcmVzZXQgYWxsIGNoZWNrcyB3aGVuIGEgcGFyZW50IGNhdGVnb3J5IGlzIGNsaWNrZWRcblx0XHRcdC8vIFxuXHRcdFx0Ly8gVE9ETyEgdGhpcyBtYWtlcyBpdCBzZXQgYSBidW5jaCBvZiBBTkQgdGFncyB0byBmaWx0ZXJcblx0XHRcdC8vIHdlIHdhbnQgT1IsIHdlIG1pZ2h0IG5vdCBldmVuIHdhbnQgdGhpcyBjb2RlIGhlcmUuLi5cblx0XHRcdGNhdGVnb3JpZXMgPSBnZXRCYXNlQ2F0ZWdvcmllcygpO1xuXHRcdFx0Y2F0cyA9IEFycmF5LmFwcGx5KDAsIEFycmF5KGNhdGVnb3JpZXNbY2F0ZWdvcnlOYW1lXS5sZW5ndGgpKS5tYXAoKHgsIHkpID0+IHkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYXRzLnB1c2goc3ViQ2F0ZWdvcnkpO1xuXHRcdH1cblxuXHRcdC8vIGhhY2t5IGFuZCB0b28gc3RyaWN0IGFuZCBsaXRlcmFsLCBidXQgd2hhdGV2ZXJcblx0XHRpZiAoY2F0ZWdvcnlOYW1lICE9PSAnQWxsIEl0ZW1zJykge1xuXHRcdFx0Y2F0cy5mb3JFYWNoKGNhdCA9PiB7XG5cdFx0XHRcdGNvbnN0IGMgPSBjYXRlZ29yaWVzW2NhdGVnb3J5TmFtZV1bY2F0XTtcblx0XHRcdFx0KGMuY2hlY2tlZCkgPyBjLmNoZWNrZWQgPSBmYWxzZSA6IGMuY2hlY2tlZCA9IHRydWU7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHsgY2F0ZWdvcmllczogY2F0ZWdvcmllcywgc2VhcmNoOiAnJyB9KTtcblx0fVxuXG5cdGNoYW5nZVNlYXJjaChzZWFyY2hUZXJtKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlYXJjaDogc2VhcmNoVGVybSwgY2F0ZWdvcmllczogZ2V0QmFzZUNhdGVnb3JpZXMoKSB9KTtcblx0fVxuXG5cdC8qXG5cdFx0UmV0dXJucyBpdGVtcyBmaWx0ZXJlZCBieSBzZWFyY2ggb3IgY2F0ZWdvcnkgb3Igbm9uZVxuXG5cdFx0VE9ETyEhIVxuXHRcdGZpbHRlclRhZ3Mgd2l0aCBjYXRlZ29yaWVzIHdpdGggbW9yZSB0aGFuIDEgdGFnIGNhdXNlcyBhIEFORCBjb25kaXRpb25cblx0XHRidXQgaXQgc2hvdWxkIGJlIGFuIE9SIGNvbmRpdGlvbiBKdW5nbGUgYW5kIFZpc2lvbiAmIFRyaW5rZXRcblx0XHRtZWFucyBpdCBtYXRjaGVzIFtqdW5nbGUsIHZpc2lvbiwgdHJpbmtldF1cblx0XHRidXQgaXQgc2hvdWxkIGJlIFtqdW5nbGVdIGFuZCBbdmlzaW9uIE9SIHRyaW5rZXRdXG5cdCAqL1xuXHRnZXRJdGVtcygpIHtcblx0XHRpZiAoIXRoaXMucHJvcHMuaXRlbXMpIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cdFx0Ly8gd2UgY291bGQganVzdCBsZWF2ZSBmaWx0ZXJCeSBhcyAnc2VhcmNoJyBieSBkZWZhdWx0XG5cdFx0Ly8gc2luY2UgaXQgd2lsbCBhbHNvIHJldHVybiBhbGwgaXRlbXMgaWYgc2VhcmNoID09PSAnJ1xuXHRcdC8vIGJ1dCBpIGZpZ3VyZSBpdCB3aWxsIGJlIG1vcmUgcGVyZm9ybWFudCBpZiB0aGVyZSBpcyBubyBpbmRleE9mIGNoZWNrXG5cdFx0Ly8gZm9yIGV2ZXJ5IGl0ZW1cblx0XHRsZXQgZmlsdGVyQnk7XG5cdFx0bGV0IGZpbHRlclRhZ3MgPSBbXTtcblxuXHRcdC8vIGNoZWNrIGlmIGl0J3MgYnkgc2VhcmNoIGZpcnN0IHRvIGF2b2lkIGxvb3BpbmcgY2F0ZWdvcmllcyBmb3IgdGFnc1xuXHRcdGlmICh0aGlzLnN0YXRlLnNlYXJjaCAmJiB0aGlzLnN0YXRlLnNlYXJjaCAhPT0gJycpIHtcblx0XHRcdGZpbHRlckJ5ID0gJ3NlYXJjaCc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdE9iamVjdC5rZXlzKHRoaXMuc3RhdGUuY2F0ZWdvcmllcykuZm9yRWFjaChrZXkgPT4ge1xuXHRcdFx0XHR0aGlzLnN0YXRlLmNhdGVnb3JpZXNba2V5XS5mb3JFYWNoKGNhdCA9PiB7XG5cdFx0XHRcdFx0aWYgKGNhdC5jaGVja2VkKSB7XG5cdFx0XHRcdFx0XHRjYXQudGFncy5mb3JFYWNoKHRhZyA9PiBmaWx0ZXJUYWdzLnB1c2godGFnKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoZmlsdGVyVGFncy5sZW5ndGgpIGZpbHRlckJ5ID0gJ3RhZ3MnO1xuXHRcdH1cblxuXHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnByb3BzLml0ZW1zKS5yZWR1Y2UoKHIsIGl0ZW1JRCkgPT4ge1xuXHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMucHJvcHMuaXRlbXNbaXRlbUlEXTtcblx0XHRcdC8vIGZpbHRlciBieSBzZWFyY2ggb3IgdGFncyBvciBub25lXG5cdFx0XHRpZiAoZmlsdGVyQnkgPT09ICdzZWFyY2gnKSB7XG5cdFx0XHRcdGlmIChpdGVtLm5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHRoaXMuc3RhdGUuc2VhcmNoLnRvTG93ZXJDYXNlKCkpICE9PSAtMSkge1xuXHRcdFx0XHRcdHIucHVzaChpdGVtKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBhbHNvIHVzZSBzZWFyY2ggdGVybSBvbiB0YWdzXG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gaXRlbS50YWdzLmZpbHRlcih0YWcgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRhZy50b0xvd2VyQ2FzZSgpID09PSB0aGlzLnN0YXRlLnNlYXJjaC50b0xvd2VyQ2FzZSgpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0aWYgKHJlc3VsdC5sZW5ndGgpIHIucHVzaChpdGVtKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2UgaWYgKGZpbHRlckJ5ID09PSAndGFncycpIHtcblx0XHRcdFx0Ly8gaGF2ZSB0byBoYXZlIGV2ZXJ5IHRhZyBpbiBmaWx0ZXJUYWdzXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGZpbHRlclRhZ3MuZmlsdGVyKGZUYWcgPT4ge1xuXHRcdFx0XHRcdHJldHVybiBpdGVtLnRhZ3MuZmlsdGVyKGlUYWcgPT4ge1xuXHRcdFx0XHRcdFx0Ly8gd2UgbG93ZXJjYXNlIGNoZWNrIGp1c3QgaW4gY2FzZSByaW90IGFwaSBkYXRhXG5cdFx0XHRcdFx0XHQvLyBpc24ndCB1bmlmb3JtZWQgYW5kIGhhcyBzb21lIHRhZ3Mgd2l0aCB3ZWlyZCBjYXNpbmdcblx0XHRcdFx0XHRcdHJldHVybiBmVGFnLnRvTG93ZXJDYXNlKCkgPT09IGlUYWcudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHR9KS5sZW5ndGg7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRpZiAocmVzdWx0Lmxlbmd0aCA9PT0gZmlsdGVyVGFncy5sZW5ndGgpIHIucHVzaChpdGVtKTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ci5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcjtcblx0XHR9LCBbXSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXsnY29sLXhzLTUgY29sLXNtLTUgY29sLW1kLTUnICsgdGhpcy5zdHlsZXMuaXRlbURpc3BsYXlXcmFwcGVyfT5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy0xMiBjb2wtc20tMTIgY29sLW1kLTEyJz5cblx0XHRcdFx0XHRcdDxJdGVtU2VhcmNoIHNlYXJjaFZhbHVlPXt0aGlzLnN0YXRlLnNlYXJjaH0gb25TZWFyY2g9e3RoaXMuY2hhbmdlU2VhcmNoLmJpbmQodGhpcyl9IC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtNiBjb2wtc20tNiBjb2wtbWQtNic+XG5cdFx0XHRcdFx0XHQ8SXRlbUNhdGVnb3JpZXMgY2F0ZWdvcmllcz17dGhpcy5zdGF0ZS5jYXRlZ29yaWVzfSBvbkNhdGVnb3J5Q2hlY2s9e3RoaXMuY2hhbmdlQ2F0ZWdvcmllcy5iaW5kKHRoaXMpfSAvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtNiBjb2wtc20tNiBjb2wtbWQtNic+XG5cdFx0XHRcdFx0XHQ8SXRlbURpc3BsYXkgaXRlbXM9e3RoaXMuZ2V0SXRlbXMoKX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtRGlzcGxheVdpZGdldDsiLCIvKlxuXHRJdGVtIGNhdGVnb3JpZXMgZmlsdGVyIGZvciBpdGVtRGlzcGxheVxuICovXG5cbmNsYXNzIEl0ZW1DYXRlZ29yaWVzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5oYW5kbGVDaGFuZ2UgPSB0aGlzLmhhbmRsZUNoYW5nZS5iaW5kKHRoaXMpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHR3cmFwcGVyOiAnaXRlbS1jYXRlZ29yeS13cmFwJyxcblx0XHRcdHBhcmVudENhdGVnb3J5OiAnY2F0ZWdvcnktd3JhcCcsIC8vIHdyYXBwZXJcblx0XHRcdHN1YkNhdGVnb3J5OiAnc3ViLWNhdGVnb3J5LXdyYXAgeGZvbnQtdGhpbicsIC8vIHdyYXBwZXJcblx0XHRcdHBhcmVudENhdGVnb3J5VGl0bGU6ICd4Zm9udCBjYXRlZ29yeS10aXRsZSB0ZXh0LWNlbnRlcicsXG5cdFx0fTtcblx0fVxuXG5cdC8qXG5cdFx0V2hlbiBhIHN1YiBjYXRlZ29yeSBpcyBjbGlja2VkXG5cdCAqL1xuXHRoYW5kbGVDaGFuZ2UoZXZlbnQpIHtcblx0XHQvLyBba2V5LCBpbmRleCBmb3Iga2V5XSBpZTogY2F0ZWdvcmllc1snU3RhcnRpbmcgTGFuZSddWzFdIGZvciBMYW5lXG5cdFx0Y29uc3QgY2F0ZWdvcnlJZCA9IGV2ZW50LnRhcmdldC52YWx1ZS5zcGxpdCgnLCcpO1xuXHRcdGNvbnN0IGNhdGVnb3J5TmFtZSA9IGNhdGVnb3J5SWRbMF07XG5cdFx0Y29uc3Qgc3ViQ2F0ZWdvcnkgPSBwYXJzZUludChjYXRlZ29yeUlkWzFdKTtcblxuXHRcdHRoaXMucHJvcHMub25DYXRlZ29yeUNoZWNrKGNhdGVnb3J5TmFtZSwgc3ViQ2F0ZWdvcnkpO1xuXHR9XG5cblx0Lypcblx0XHRXaGVuIGEgbWFpbiBjYXRlZ29yeSBpcyBjbGlja2VkXG5cdCAqL1xuXHRoYW5kbGVDYXRlZ29yeShjYXRlZ29yeU5hbWUpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2F0ZWdvcnlDaGVjayhjYXRlZ29yeU5hbWUpO1xuXHR9XG5cblx0cmVuZGVyU3ViQ2F0ZWdvcmllcyhjYXRlZ29yaWVzLCBwYXJlbnRDYXRlZ29yeSkge1xuXHRcdHJldHVybiBjYXRlZ29yaWVzLm1hcCgoY2F0LCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtjYXQubmFtZX0gY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5zdWJDYXRlZ29yeX0+XG5cdFx0XHRcdFx0PGxhYmVsPlxuXHRcdFx0XHRcdFx0PGlucHV0IHR5cGU9J2NoZWNrYm94JyB2YWx1ZT17W3BhcmVudENhdGVnb3J5LCBpZHhdfSBvbkNoYW5nZT17dGhpcy5oYW5kbGVDaGFuZ2V9IGNoZWNrZWQ9e2NhdC5jaGVja2VkfSAvPiB7Y2F0Lm5hbWV9XG5cdFx0XHRcdFx0PC9sYWJlbD5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9XG5cdFxuXHRyZW5kZXJDYXRlZ29yaWVzKCkge1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnByb3BzLmNhdGVnb3JpZXMpLm1hcChrZXkgPT4ge1xuXHRcdFx0Y29uc3Qgc3ViQ2F0ZWdvcmllcyA9IHRoaXMucHJvcHMuY2F0ZWdvcmllc1trZXldO1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PGRpdiBrZXk9e2tleX0gY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5wYXJlbnRDYXRlZ29yeX0+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5wYXJlbnRDYXRlZ29yeVRpdGxlfT48YSBocmVmPScjJyBvbkNsaWNrPXt0aGlzLmhhbmRsZUNhdGVnb3J5LmJpbmQodGhpcywga2V5KX0+e2tleX08L2E+PC9zcGFuPlxuXHRcdFx0XHRcdHt0aGlzLnJlbmRlclN1YkNhdGVnb3JpZXMoc3ViQ2F0ZWdvcmllcywga2V5KX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpOyBcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfT5cblx0XHRcdHt0aGlzLnJlbmRlckNhdGVnb3JpZXMoKX1cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbUNhdGVnb3JpZXM7IiwiLypcblx0RGlzcGxheXMgYWxsIGF2YWlsYWJsZSBvciBmaWx0ZXJlZCAoYnkgc2VhcmNoIG9yIGNhdGVnb3JpZXMpIGl0ZW1zXG4gKi9cblxuaW1wb3J0IEl0ZW1CdXR0b24gZnJvbSAnLi4vLi4vaXRlbUJ1dHRvbic7XG5cbmNsYXNzIEl0ZW1EaXNwbGF5IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ2l0ZW0tZGlzcGxheS13cmFwJ1xuXHRcdH07XG5cdH1cblxuXHRyZW5kZXJJdGVtcygpIHtcblx0XHRyZXR1cm4gdGhpcy5wcm9wcy5pdGVtcy5tYXAoaXRlbSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8SXRlbUJ1dHRvbiBrZXk9e2l0ZW0uaWR9IGl0ZW09e2l0ZW19IC8+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBpZD0naXRlbS1kaXNwbGF5JyBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9PlxuXHRcdFx0e3RoaXMucmVuZGVySXRlbXMoKX1cdFxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtRGlzcGxheTsiLCIvKlxuXHRTZWFyY2ggYmFyIGZvciBpdGVtRGlzcGxheVxuICovXG5cbmNsYXNzIEl0ZW1TZWFyY2ggZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ2lucHV0LWdyb3VwIGlucHV0LWdyb3VwLXNtJyxcblx0XHRcdHNlYXJjaEJhcjogJ2Zvcm0tY29udHJvbCdcblx0XHR9O1xuXHR9XG5cblx0aGFuZGxlU2VhcmNoKGV2ZW50KSB7XG5cdFx0dGhpcy5wcm9wcy5vblNlYXJjaChldmVudC50YXJnZXQudmFsdWUpO1xuXHR9XG5cbiAgLy8gd2h5IGRvIGkgbmVlZCB0byBiaW5kIHRoaXMuaGFuZGxlU2VhcmNoIGFuZCBpbiB0aGUgcGFyZW50IGhhbmRsZXIgZnVuY3Rpb24/IEVTNiBjbGFzc2VzP1xuICAvLyBSZWFjdCBhdXRvIGRpZCB0aGlzIGZvciBtZSB3aXRoIFJlYWN0LmNyZWF0ZUNsYXNzXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfT5cblx0XHRcdDxpbnB1dCBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLnNlYXJjaEJhcn0gdHlwZT0ndGV4dCcgcGxhY2Vob2xkZXI9J1NlYXJjaCBJdGVtcycgb25DaGFuZ2U9e3RoaXMuaGFuZGxlU2VhcmNoLmJpbmQodGhpcyl9IHZhbHVlPXt0aGlzLnByb3BzLnNlYXJjaFZhbHVlfSAvPlxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtU2VhcmNoOyIsImNsYXNzIENoYW1waW9uU2VsZWN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWFyY2hDaGFtcGlvbnMgPSB0aGlzLnNlYXJjaENoYW1waW9ucy5iaW5kKHRoaXMpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0Y2hhbXBpb25Ecm9wRG93bldyYXA6ICdpdGVtLWNoYW1waW9uLWRyb3Bkb3duLXdyYXAnLFxuXHRcdFx0Y2hhbXBpb25Ecm9wRG93bjogJ2l0ZW0tY2hhbXBpb24tZHJvcGRvd24nLFxuXHRcdFx0aGlkZTogJ2hpZGRlbicsXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHRzZWFyY2hWYWx1ZTogJycsXG5cdFx0XHRzaG93RHJvcERvd246IGZhbHNlXG5cdFx0fTtcblx0fVxuXG5cdG9uRHJvcERvd24oYm9vbCwgZXZlbnQpIHtcblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblx0XHRjb25zdCBzZXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoYXQuc2V0U3RhdGUoeyBzaG93RHJvcERvd246IGJvb2wgfSk7XG5cdFx0fVxuXG5cdFx0Ly8gaGFja3kgd2F5IHRvIGdldCBtb3VzZSBjbGlja3MgdG8gdHJpZ2dlciBmaXJzdCBiZWZvcmUgb25CbHVyXG5cdFx0aWYgKCFib29sKSB7XG5cdFx0XHRzZXRUaW1lb3V0KHNldCwgMjAwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0KCk7XG5cdFx0fVxuXHR9XG5cblx0c2VhcmNoQ2hhbXBpb25zKGV2ZW50KSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlYXJjaFZhbHVlOiBldmVudC50YXJnZXQudmFsdWUgfSk7XG5cdH1cblx0XG5cdC8qIFxuXHRcdFdoZW4gdXNlciBwcmVzc2VzIGVudGVyLCB3ZSBuZWVkIHRvIHZlcmlmeSBpZiB0aGUgY2hhbXBpb24gYWN0dWFsbHkgZXhpc3RzXG5cdFx0RG8gbm90aGluZyBpZiBpdCBkb2VzIG5vdFxuXHQqL1xuXHRoYW5kbGVTdWJtaXQoZXZlbnQpIHtcblx0XHRpZiAoZXZlbnQud2hpY2ggPT09IDEzKSB7IC8vIGVudGVyXG5cdFx0XHRjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldC52YWx1ZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y29uc3QgY2hhbXAgPSBDaGFtcGlvbkRhdGEuZmlsdGVyKGNoYW1waW9uID0+IHtcblx0XHRcdFx0cmV0dXJuIGNoYW1waW9uLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gaW5wdXQgfHwgY2hhbXBpb24ucmlvdEtleS50b0xvd2VyQ2FzZSgpID09PSBpbnB1dDtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoY2hhbXAubGVuZ3RoKSB7XG5cdFx0XHRcdHRoaXMub25DaGFtcGlvblNlbGVjdChjaGFtcFswXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0b25DaGFtcGlvblNlbGVjdChjaGFtcGlvbikge1xuXHRcdHRoaXMucHJvcHMuaGFuZGxlQ2hhbXBpb25TZWxlY3QoY2hhbXBpb24pO1xuXHR9XG5cblx0cmVuZGVyU2VhcmNoUmVzdWx0c0l0ZW1zKCkge1xuXHRcdGNvbnN0IHNlYXJjaFRlcm0gPSB0aGlzLnN0YXRlLnNlYXJjaFZhbHVlLnRvTG93ZXJDYXNlKCk7XG5cdFx0bGV0IGNoYW1waW9ucyA9IENoYW1waW9uRGF0YTtcblxuXHRcdC8vIGZpcnN0IGZpbHRlciBieSBzZWFyY2hcdFx0XG5cdFx0aWYgKHNlYXJjaFRlcm0pIHtcblx0XHRcdGNoYW1waW9ucyA9IENoYW1waW9uRGF0YS5maWx0ZXIoY2hhbXAgPT4ge1xuXHRcdFx0XHRjb25zdCBuYW1lID0gY2hhbXAubmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRjb25zdCBrZXluYW1lID0gY2hhbXAucmlvdEtleS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRyZXR1cm4gbmFtZS5pbmRleE9mKHNlYXJjaFRlcm0pID09PSAwIHx8IGtleW5hbWUuaW5kZXhPZihzZWFyY2hUZXJtKSA9PSAwO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBieSBuYW1lIC8gZmlyc3QgbGV0dGVyIG9mIG5hbWVcblx0XHRjaGFtcGlvbnMuc29ydChmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRjb25zdCBhYSA9IGEubmFtZVswXS5jaGFyQ29kZUF0KCk7XG5cdFx0XHRjb25zdCBiYiA9IGIubmFtZVswXS5jaGFyQ29kZUF0KCk7XG5cdFx0XHRpZiAoYWEgPiBiYikge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSBpZiAoYmIgPiBhYSkge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRcblx0XHQvLyB3ZSBvbmx5IHNob3cgdGhlIGZpcnN0IDEwIG9mIHRoZSByZXN1bHRzXG5cdFx0bGV0IGNoYW1waW9uc2xpbWl0ID0gY2hhbXBpb25zLnNsaWNlKDAsIDEwKTtcblxuXHRcdHJldHVybiBjaGFtcGlvbnNsaW1pdC5tYXAoY2hhbXBpb24gPT4ge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PGxpIGtleT17Y2hhbXBpb24ucmlvdElkfSBvbkNsaWNrPXt0aGlzLm9uQ2hhbXBpb25TZWxlY3QuYmluZCh0aGlzLCBjaGFtcGlvbil9PlxuXHRcdFx0XHRcdDxpbWcgc3JjPXsnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyBjaGFtcGlvbi5yaW90S2V5ICsgJy5wbmcnfSAvPlxuXHRcdFx0XHRcdDxzcGFuPntjaGFtcGlvbi5uYW1lfTwvc3Bhbj5cblx0XHRcdFx0PC9saT5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXJTZWFyY2hSZXN1bHRzKCkge1xuXHRcdGxldCBjbHMgPSB0aGlzLnN0eWxlcy5jaGFtcGlvbkRyb3BEb3duV3JhcDtcblx0XHRpZiAoIXRoaXMuc3RhdGUuc2hvd0Ryb3BEb3duKSB7XG5cdFx0XHRjbHMgKz0gJyAnICsgdGhpcy5zdHlsZXMuaGlkZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9e2Nsc30+XG5cdFx0XHRcdDx1bCBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNoYW1waW9uRHJvcERvd259PlxuXHRcdFx0XHRcdHt0aGlzLnJlbmRlclNlYXJjaFJlc3VsdHNJdGVtcygpfVxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRsZXQgaW1hZ2VVcmwgPSAnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyB0aGlzLnByb3BzLmNoYW1waW9uLnJpb3RLZXkgKyAnLnBuZyc7XG5cdFx0bGV0IHJlbmRlclBpY2tlck9yQ2hhbXBpb24gPSAoPGgyPnt0aGlzLnByb3BzLmNoYW1waW9uLm5hbWV9PC9oMj4pO1xuXG5cdFx0aWYgKCF0aGlzLnByb3BzLmNoYW1waW9uLnJpb3RJZCkge1xuXHRcdFx0aW1hZ2VVcmwgPSAnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vNS4yLjEvaW1nL3VpL2NoYW1waW9uLnBuZyc7XG5cdFx0XHQvLyByZW5kZXIgdGhlIGNoYW1waW9uIHBpY2tlclxuXHRcdFx0cmVuZGVyUGlja2VyT3JDaGFtcGlvbiA9IChcblx0XHRcdFx0XHQ8ZGl2IG9uQmx1cj17dGhpcy5vbkRyb3BEb3duLmJpbmQodGhpcywgZmFsc2UpfT5cblx0XHRcdFx0XHQ8aW5wdXQgdHlwZT0ndGV4dCcgcGxhY2Vob2xkZXI9J1BpY2sgYSBDaGFtcGlvbiBmb3IgdGhpcyBidWlsZCcgdmFsdWU9e3RoaXMuc3RhdGUuc2VhcmNoVmFsdWV9IG9uQ2hhbmdlPXt0aGlzLnNlYXJjaENoYW1waW9uc30gb25Gb2N1cz17dGhpcy5vbkRyb3BEb3duLmJpbmQodGhpcywgdHJ1ZSl9IG9uS2V5VXA9e3RoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyl9IG9uS2V5RG93bj17dGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKX0gLz5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJTZWFyY2hSZXN1bHRzKCl9XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0PGltZyBzcmM9e2ltYWdlVXJsfSAvPlxuXHRcdFx0XHR7cmVuZGVyUGlja2VyT3JDaGFtcGlvbn1cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBDaGFtcGlvblNlbGVjdDsiLCJjbGFzcyBDcmVhdGVCbG9jayBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0aXRlbUJsb2NrOiAnaXRlbS1ibG9jaycsXG5cdFx0XHRpdGVtX2Jsb2NrX2FkZDogJ2l0ZW0tc2V0LWFkZC1ibG9jaydcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnByb3BzLmFkZERyYWcodGhpcy5yZWZzLmRyYWcuZ2V0RE9NTm9kZSgpKTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgcmVmPSdkcmFnJyBpZD0nY3JlYXRlLWJsb2NrJyBjbGFzc05hbWU9eydyb3cgJyArIHRoaXMuc3R5bGVzLml0ZW1CbG9ja30gb25DbGljaz17dGhpcy5wcm9wcy5oYW5kbGVyQ3JlYXRlfT5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5pdGVtX2Jsb2NrX2FkZH0+XG5cdFx0XHRcdERyYWcgSXRlbXMgSGVyZSB0byBDcmVhdGUgYSBOZXcgQmxvY2tcblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2Plx0XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IENyZWF0ZUJsb2NrO1x0XG4iLCJpbXBvcnQgQ2hhbXBpb25TZWxlY3QgZnJvbSAnLi9jaGFtcGlvblNlbGVjdCc7XG5pbXBvcnQgSXRlbUJsb2NrcyBmcm9tICcuL2l0ZW1CbG9ja3MnO1xuaW1wb3J0IEl0ZW1TZXRVcGxvYWQgZnJvbSAnLi91cGxvYWQnO1xuaW1wb3J0IENyZWF0ZUJsb2NrIGZyb20gJy4vY3JlYXRlQmxvY2snO1xuaW1wb3J0IE1hcFNlbGVjdCBmcm9tICcuL21hcFNlbGVjdCc7XG5pbXBvcnQgU2hhcmUgZnJvbSAnLi4vLi4vc2hhcmUnO1xuaW1wb3J0IERvd25sb2FkIGZyb20gJy4uLy4uL2Rvd25sb2FkJztcblxudmFyIGRyYWd1bGEgPSByZXF1aXJlKCcuLi8uLi9kcmFndWxhL3JlYWN0LWRyYWd1bGEnKTtcblxuY2xhc3MgSXRlbVNldFdpZGdldCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGl0ZW1TZXRXcmFwcGVyOiAnJyxcblx0XHRcdGl0ZW1CbG9jazogJ2l0ZW0tYmxvY2snLFxuXHRcdFx0aXRlbV9ibG9ja19hZGQ6ICdpdGVtLXNldC1hZGQtYmxvY2snLFxuXHRcdFx0YnV0dG9uU2F2ZTogJ2J0biBidG4tZGVmYXVsdCdcblx0XHR9O1xuXG5cdFx0dGhpcy5zdGF0ZSA9IGl0ZW1TZXRTdG9yZS5nZXRBbGwoKTtcblxuXHRcdHRoaXMudG9rZW4gPSAwO1xuXG5cdFx0dGhpcy5kciA9IGRyYWd1bGEoe1xuXHRcdFx0Y29weTogZmFsc2Vcblx0XHR9KTtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMudG9rZW4gPSBpdGVtU2V0U3RvcmUuYWRkTGlzdGVuZXIodGhpcy5fb25DaGFuZ2UuYmluZCh0aGlzKSk7XG5cblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblx0XHR0aGlzLmRyLmNvbnRhaW5lcnMucHVzaChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaXRlbS1kaXNwbGF5JykpO1xuXG5cdFx0dGhpcy5kci5vbignZHJvcCcsIGZ1bmN0aW9uKGVsLCB0YXJnZXQsIHNyYykge1xuXHRcdFx0Y29uc3QgaWQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS1pZCcpO1xuXHRcdFx0Y29uc3QgaWR4ID0gdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1pZHgnKTtcblx0XHRcdGlmICgoaWR4ID09PSAwIHx8IGlkeCApICYmIHNyYy5pZCA9PSAnaXRlbS1kaXNwbGF5JyAmJiB0YXJnZXQuaWQgIT0gJ2l0ZW0tZGlzcGxheScpIHtcblx0XHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5hZGRfaXRlbXNldF9pdGVtKGlkeCwgaWQpKTtcblx0XHRcdH0gZWxzZSBpZiAoc3JjLmlkID09ICdpdGVtLWRpc3BsYXknICYmIHRhcmdldC5pZCA9PSdjcmVhdGUtYmxvY2snKSB7XG5cdFx0XHRcdHRoYXQub25DcmVhdGVCbG9jayhbXG5cdFx0XHRcdFx0eyBpZDogaWQsIGNvdW50OiAxIH1cblx0XHRcdFx0XSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpdGVtU2V0U3RvcmUucmVtb3ZlTGlzdGVuZXIoJycsIHRoaXMudG9rZW4pO1xuXHR9XG5cblx0X29uQ2hhbmdlKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoaXRlbVNldFN0b3JlLmdldEFsbCgpKTtcblx0fVxuXG5cdGFkZERyYWdDb250YWluZXIoZWwpIHtcblx0XHR0aGlzLmRyLmNvbnRhaW5lcnMucHVzaChlbCk7XG5cdH1cblxuXHRjaGFuZ2VUaXRsZShldmVudCkge1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMudXBkYXRlX2l0ZW1zZXRfdGl0bGUoZXZlbnQudGFyZ2V0LnZhbHVlKSk7XG5cdH1cblxuXHRjaGFuZ2VUeXBlKGJsb2NrSWR4LCB0eHQpIHtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnVwZGF0ZV9pdGVtc2V0X2Jsb2NrX3R5cGUoYmxvY2tJZHgsIHR4dCkpO1xuXHR9XG5cblx0b25DcmVhdGVCbG9jayhpdGVtcywgZXZlbnQpIHtcblx0XHR2YXIgaSA9IFtdO1xuXHRcdGlmICghZXZlbnQpIGkgPSBpdGVtcztcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmNyZWF0ZV9pdGVtc2V0X2Jsb2NrKHtcblx0XHRcdHR5cGU6ICcnLFxuXHRcdFx0cmVjTWF0aDogZmFsc2UsXG5cdFx0XHRtaW5TdW1tb25lckxldmVsOiAtMSxcblx0XHRcdG1heFN1bW1tb25lckxldmVsOiAtMSxcblx0XHRcdHNob3dJZlN1bW1vbmVyU3BlbGw6ICcnLFxuXHRcdFx0aGlkZUlmU3VtbW9uZXJTcGVsbDogJycsXG5cdFx0XHRpdGVtczogaVxuXHRcdH0pKTtcblx0fVxuXG5cdG9uUmVtb3ZlQmxvY2soaWR4KSB7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5kZWxldGVfaXRlbXNldF9ibG9jayhpZHgpKTtcblx0fVxuXHRcblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J2NvbC14cy02IGNvbC1zbS02IGNvbC1tZC02JyArIHRoaXMuc3R5bGVzLml0ZW1TZXRXcmFwcGVyfT5cblx0XHRcdFxuXHRcdFx0XHQ8U2hhcmUgaWQ9e3RoaXMuc3RhdGUuaWR9IHNob3c9e3RoaXMucHJvcHMuc2hvd1NoYXJlfSAvPlxuXHRcdFx0XHQ8RG93bmxvYWQgc2hvdz17dGhpcy5wcm9wcy5zaG93RG93bmxvYWR9IGlkPXt0aGlzLnN0YXRlLmlkfSBkYXRhPXt0aGlzLnN0YXRlLml0ZW1zZXR9IC8+XG5cblx0XHRcdFx0PEl0ZW1TZXRVcGxvYWQgc2hvdz17dGhpcy5zdGF0ZS5zaG93RmlsZVVwbG9hZH0gLz5cblxuXHRcdFx0XHQ8YnIgLz5cblxuXHRcdFx0XHQ8Q2hhbXBpb25TZWxlY3QgaGFuZGxlQ2hhbXBpb25TZWxlY3Q9e3RoaXMucHJvcHMuaGFuZGxlQ2hhbXBpb25TZWxlY3R9IGFwaVZlcnNpb249e3RoaXMucHJvcHMuYXBpVmVyc2lvbn0gY2hhbXBpb249e3RoaXMucHJvcHMuY2hhbXBpb259IC8+XG5cblxuXHRcdFx0XHQ8TWFwU2VsZWN0IC8+XG5cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdDxpbnB1dCBjbGFzc05hbWU9J2Zvcm0tY29udHJvbCcgdHlwZT0ndGV4dCcgdmFsdWU9e3RoaXMuc3RhdGUuaXRlbXNldC50aXRsZX0gcGxhY2Vob2xkZXI9J05hbWUgeW91ciBpdGVtIHNldCBidWlsZCcgb25DaGFuZ2U9e3RoaXMuY2hhbmdlVGl0bGUuYmluZCh0aGlzKX0gLz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxiciAvPlxuXG5cdFx0XHRcdDxJdGVtQmxvY2tzIGFkZERyYWc9e3RoaXMuYWRkRHJhZ0NvbnRhaW5lci5iaW5kKHRoaXMpfSBibG9ja3M9e3RoaXMuc3RhdGUuaXRlbXNldC5ibG9ja3N9IGhhbmRsZUJsb2NrVHlwZT17dGhpcy5jaGFuZ2VUeXBlLmJpbmQodGhpcyl9IGhhbmRsZVJlbW92ZUJsb2NrPXt0aGlzLm9uUmVtb3ZlQmxvY2suYmluZCh0aGlzKX0gLz5cblxuXHRcdFx0XHQ8Q3JlYXRlQmxvY2sgYWRkRHJhZz17dGhpcy5hZGREcmFnQ29udGFpbmVyLmJpbmQodGhpcyl9IGhhbmRsZXJDcmVhdGU9e3RoaXMub25DcmVhdGVCbG9jay5iaW5kKHRoaXMpfSAvPlxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbVNldFdpZGdldDsiLCJpbXBvcnQgSXRlbUJ1dHRvbiBmcm9tICcuLi8uLi9pdGVtQnV0dG9uJztcblxuY2xhc3MgSXRlbUJsb2NrIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0aXRlbUJsb2NrOiAnaXRlbS1ibG9jaycsXG5cdFx0XHRpdGVtX2Jsb2NrX3RpdGxlOiAnaXRlbS1zZXQtYmxvY2stdGl0bGUnLFxuXHRcdFx0aXRlbV9pY29uX2Jsb2NrOiAnaXRlbS1zZXQtYnV0dG9uLWJsb2NrJyxcblx0XHRcdGl0ZW1faWNvbl9jb3VudDogJ2l0ZW0tc2V0LWJ1dHRvbi1ibG9jay1jb3VudCcsXG5cdFx0fTtcblx0fVxuXHRcblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5wcm9wcy5hZGREcmFnKHRoaXMucmVmcy5kcmFnLmdldERPTU5vZGUoKSk7XG5cdH1cblxuXHRjaGFuZ2VUeXBlKGlkLCBpZHgsIGV2ZW50KSB7XG5cdFx0Y29uc29sZS5sb2coaWQpO1xuXHRcdHRoaXMucHJvcHMuaGFuZGxlQmxvY2tUeXBlKGlkeCwgZXZlbnQudGFyZ2V0LnZhbHVlKTtcblx0fVxuXG5cdG9uUmVtb3ZlQmxvY2soaWR4KSB7XG5cdFx0dGhpcy5wcm9wcy5oYW5kbGVSZW1vdmVCbG9jayhpZHgpO1xuXHR9XG5cblx0cmVuZGVySXRlbXMoaXRlbXMpIHtcblx0XHRyZXR1cm4gaXRlbXMubWFwKChpdGVtLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtpdGVtLmlkICsgJy0nICsgaWR4fSBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLml0ZW1faWNvbl9ibG9ja30+XG5cdFx0XHRcdFx0PEl0ZW1CdXR0b24gaXRlbUlkPXtpdGVtLmlkfSAvPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuaXRlbV9pY29uX2NvdW50fT57aXRlbS5jb3VudH08L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy5pdGVtQmxvY2t9PlxuXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J3JvdyAnICsgdGhpcy5zdHlsZXMuaXRlbV9ibG9ja190aXRsZX0+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtMTAgY29sLXNtLTEwIGNvbC1tZC0xMCc+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2lucHV0LWdyb3VwIGlucHV0LWdyb3VwLXNtJz5cblx0XHRcdFx0XHRcdDxpbnB1dCBjbGFzc05hbWU9J2Zvcm0tY29udHJvbCcgdHlwZT0ndGV4dCcgdmFsdWU9e3RoaXMucHJvcHMuYmxvY2sudHlwZX0gb25DaGFuZ2U9e3RoaXMuY2hhbmdlVHlwZS5iaW5kKHRoaXMsIHRoaXMucHJvcHMuYmxvY2suaWQsIHRoaXMucHJvcHMuaWR4KX0gcGxhY2Vob2xkZXI9J2V4cGxhaW4gdGhpcyBpdGVtIHJvdycgLz5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdpbnB1dC1ncm91cC1hZGRvbic+XG5cdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cImdseXBoaWNvbiBnbHlwaGljb24tcGVuY2lsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtMSBjb2wtc20tMSBjb2wtbWQtMSc+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcIiBvbkNsaWNrPXt0aGlzLm9uUmVtb3ZlQmxvY2suYmluZCh0aGlzLCB0aGlzLnByb3BzLmlkeCl9Pjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHRcdDxkaXYgcmVmPSdkcmFnJyBkYXRhLWJsb2NrLWlkeD17dGhpcy5wcm9wcy5pZHh9IGNsYXNzTmFtZT0nY29sLXhzLTEyIGNvbC1zbS0xMiBjb2wtbWQtMTIgZHJhZy1jb250YWluZXInPlxuXHRcdFx0XHRcdHt0aGlzLnJlbmRlckl0ZW1zKHRoaXMucHJvcHMuYmxvY2suaXRlbXMpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1CbG9jazsiLCJpbXBvcnQgSXRlbUJsb2NrIGZyb20gJy4vaXRlbUJsb2NrJztcblxuY2xhc3MgSXRlbUJsb2NrcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRjb25zdCByZW5kZXJCbG9ja3MgPSB0aGlzLnByb3BzLmJsb2Nrcy5tYXAoKGJsb2NrLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxJdGVtQmxvY2sga2V5PXtibG9jay5pZCArICctJyArIGlkeH0gYmxvY2s9e2Jsb2NrfSBpZHg9e2lkeH0gYWRkRHJhZz17dGhpcy5wcm9wcy5hZGREcmFnfSBoYW5kbGVCbG9ja1R5cGU9e3RoaXMucHJvcHMuaGFuZGxlQmxvY2tUeXBlfSBoYW5kbGVSZW1vdmVCbG9jaz17dGhpcy5wcm9wcy5oYW5kbGVSZW1vdmVCbG9ja30gLz5cblx0XHRcdCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdj5cblx0XHRcdFx0e3JlbmRlckJsb2Nrc31cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtQmxvY2tzO1x0XG4iLCJjbGFzcyBNYXBTZWxlY3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdFBpY2sgZm9yIHdoYXQgbWFwcyBoZXJlXG5cdFx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTWFwU2VsZWN0OyIsImNsYXNzIEl0ZW1TZXRVcGxvYWQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGVyckRpc3BsYXk6ICd1cGxvYWQtZXJyb3InXG5cdFx0fVxuXG5cdFx0dGhpcy5oYW5kbGVVcGxvYWQgPSB0aGlzLmhhbmRsZVVwbG9hZC5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuaGFuZGxlU3VibWl0ID0gdGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKTtcblxuXHRcdHRoaXMuY2xlYXJFcnJUaW1lciA9IDA7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdGVycm9yOiAnJ1xuXHRcdH1cblx0fVxuXG5cdHZhbGlkYXRlUGFyc2VkKHBhcnNlZEpzb24pIHtcblx0XHQvLyBUT0RPIHZhbGlkYXRlXG5cdFx0Ly8gLi4uXG5cdFx0XG5cdFx0Ly8gb25jZSB2YWxpZGF0ZWQgc2F2ZSB0byBzdG9yZVxuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMudXBsb2FkX2l0ZW1zZXQocGFyc2VkSnNvbikpO1xuXHR9XG5cblx0aGFuZGxlRXJyb3IoZXJyLCBmaWxlbmFtZSkge1xuXHRcdGxldCBlcnJvciA9ICdVbmFibGUgdG8gcGFyc2UgdGhpcyBmaWxlLCBpdCBtYXliZSBub3QgdmFsaWQnO1xuXHRcdHN3aXRjaCAoZXJyLnRvU3RyaW5nKCkpIHtcblx0XHRcdGNhc2UgJ3Rvb2JpZyc6XG5cdFx0XHRcdGVycm9yID0gJ1RoZSBmaWxlXFwncyBzaXplIGlzIHRvbyBiaWcgYW5kIG1heSBub3QgYmUgdmFsaWQnXG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoeyBlcnJvcjogZmlsZW5hbWUgKyAnOiAnICsgZXJyb3IgfSk7XG5cdH1cblxuXHRjbGVhckVycm9yKCkge1xuXHRcdGlmICh0aGlzLmNsZWFyRXJyVGltZXIpIHtcblx0XHRcdGNsZWFySW50ZXJ2YWwodGhpcy5jbGVhckVyclRpbWVyKTtcblx0XHR9XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGVycm9yOiAnJyB9KTtcblx0fVxuXG5cdGhhbmRsZVVwbG9hZChldmVudCkge1xuXHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIHZhciBmaWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzWzBdO1xuXG4gICAgaWYgKGZpbGUuc2l6ZSA+IDE1MDAwKSB7XG4gICAgXHR0aGlzLmhhbmRsZUVycm9yKCd0b29iaWcnLCBmaWxlLm5hbWUpO1xuICAgIFx0cmV0dXJuO1xuICAgIH1cblxuICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbih1cGxvYWQpIHtcbiAgICBcdGxldCBwYXJzZWQ7XG4gICAgXHRsZXQgZXJyID0gJyc7XG5cdCAgICB0cnkge1xuXHRcdCAgICBwYXJzZWQgPSBKU09OLnBhcnNlKHVwbG9hZC50YXJnZXQucmVzdWx0KVxuXHRcdCAgfSBjYXRjaChlKSB7XG5cdFx0ICBcdGVyciA9IGU7XG5cdFx0ICB9XG5cdFx0ICBpZiAoZXJyIHx8ICFwYXJzZWQpIHtcblx0XHQgIFx0dGhhdC5oYW5kbGVFcnJvcihlcnIsIGZpbGUubmFtZSk7XG5cdFx0ICB9IGVsc2Uge1xuXHRcdCAgXHR0aGF0LnZhbGlkYXRlUGFyc2VkKHBhcnNlZCk7XG5cdFx0ICB9XG5cdFx0ICBjb25zdCBlbCA9IFJlYWN0LmZpbmRET01Ob2RlKHRoYXQucmVmcy5pbnB1dEVsZW0pO1xuXHRcdCAgZWwudmFsdWUgPSAnJztcbiAgICB9XG4gIFx0cmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gIH1cblxuXHRoYW5kbGVTdWJtaXQoZXZlbnQpIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdC8vIGRvbid0IHNob3cgdGhlIHVwbG9hZCBmb3JtIGlmIHVzZXIgYWxyZWFkeSB1cGxvYWRlZFxuXHRcdGlmICghdGhpcy5wcm9wcy5zaG93KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0bGV0IGVycm9yO1xuXHRcdC8vIGZhZGUgYXdheSBlcnJvcnNcblx0XHRpZiAodGhpcy5zdGF0ZS5lcnJvcikge1xuXHRcdFx0Ly8gaWYgdGhlcmUncyBhIHByZXZpb3VzIHRpbWVyLCBzdG9wIGl0IGZpcnN0XG5cdFx0XHRpZiAodGhpcy5jbGVhckVyclRpbWVyKSB7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwodGhpcy5jbGVhckVyclRpbWVyKTtcblx0XHRcdH1cblx0XHRcdGVycm9yID0gKDxzcGFuIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuZXJyRGlzcGxheX0gb25DbGljaz17dGhpcy5jbGVhckVycm9yLmJpbmQodGhpcyl9Pnt0aGlzLnN0YXRlLmVycm9yfTwvc3Bhbj4pO1xuXHRcdFx0dGhpcy5jbGVhckVyclRpbWVyID0gc2V0VGltZW91dCh0aGlzLmNsZWFyRXJyb3IuYmluZCh0aGlzKSwgMjUwMCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXY+XG5cdFx0XHQ8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXR9IGVuY1R5cGU9XCJtdWx0aXBhcnQvZm9ybS1kYXRhXCI+XG5cdFx0XHRcdDxpbnB1dCByZWY9J2lucHV0RWxlbScgdHlwZT0nZmlsZScgYWNjZXB0PScuanNvbicgb25DaGFuZ2U9e3RoaXMuaGFuZGxlVXBsb2FkfSAvPlxuXHRcdFx0PC9mb3JtPlxuXHRcdFx0e2Vycm9yfVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1TZXRVcGxvYWQ7XHRcbiIsImNsYXNzIFNhdmVSZXN1bHQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHR3cmFwcGVyOiAncG9wdXAtd3JhcHBlcicsXG5cdFx0XHRjb250YWluZXI6ICdwb3B1cC1jb250YWluZXInLFxuXG5cdFx0XHRjb21wb25lbnRDb250YWluZXI6ICdzYXZlLXJlc3VsdC1jb250YWluZXInLFxuXHRcdFx0aWNvbjogJ3NhdmUtcmVzdWx0LWljb24nLFxuXHRcdFx0bWVzc2FnZTogJ3NhdmUtcmVzdWx0LW1lc3NhZ2UnLFxuXHRcdFx0cmVtb3ZlQnV0dG9uOiAnc2F2ZS1yZXN1bHQtYnV0dG9uJyxcblx0XHRcdGdyZWVuOiAnZm9udC1ncmVlbicsXG5cdFx0XHRyZWQ6ICdmb250LXJlZCdcblx0XHR9O1xuXHR9XG5cblx0cmVtb3ZlUG9wdXAoYnV0dG9uQ2xpY2ssIGV2ZW50KSB7XG5cdFx0Y29uc3QgcmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmdvdF9zYXZlX3N0YXR1cygpKTtcblx0XHR9XG5cblx0XHRpZiAoYnV0dG9uQ2xpY2sudGFyZ2V0KSBldmVudCA9IGJ1dHRvbkNsaWNrO1xuXHRcdGlmIChidXR0b25DbGljayA9PT0gdHJ1ZSkge1xuXHRcdFx0cmVtb3ZlKCk7XHRcdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSA9PT0gdGhpcy5zdHlsZXMud3JhcHBlcikge1xuXHRcdFx0XHRyZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG5cdHJlbmRlcigpIHtcblx0XHRjb25zdCByZXN1bHQgPSB0aGlzLnByb3BzLnJlc3VsdDtcblx0XHRsZXQgbWVzc2FnZSA9ICcnO1xuXG5cdFx0bGV0IGdseXBoID0gJ2dseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlJztcblx0XHRsZXQgY29sb3IgPSB0aGlzLnN0eWxlcy5yZWQ7XG5cdFx0aWYgKHJlc3VsdC5tc2cgPT09ICdvaycpIHtcblx0XHRcdGNvbG9yID0gdGhpcy5zdHlsZXMuZ3JlZW47XG5cdFx0XHRnbHlwaCA9ICdnbHlwaGljb24gZ2x5cGhpY29uLW9rJztcblx0XHRcdG1lc3NhZ2UgPSAnWW91ciBJdGVtIEJ1aWxkIGhhcyBiZWVuIHNhdmVkLiBIZWFkIG92ZXIgdG8gRG93bmxvYWQgdG8gZ2V0IGl0IG9uIHlvdXIgY29tcHV0ZXIsIG9yIFNoYXJlIHRvIHNob3cgb3RoZXJzIHlvdXIgYW1hemluZyBidWlsZCEnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlID0gJ1lvdXIgSXRlbSBCdWlsZCBpcyBtaXNzaW5nIHNvbWV0aGluZywgKG1vcmUgZGV0YWlscyB0byBjb21lKSc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfSBvbkNsaWNrPXt0aGlzLnJlbW92ZVBvcHVwLmJpbmQodGhpcywgZmFsc2UpfT5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNvbnRhaW5lcn0+XG5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNvbXBvbmVudENvbnRhaW5lcn0+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e2NvbG9yICsgJyAnICsgdGhpcy5zdHlsZXMuaWNvbn0+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9e2dseXBofT48L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMubWVzc2FnZX0+XG5cdFx0XHRcdFx0XHR7bWVzc2FnZX1cblx0XHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5yZW1vdmVCdXR0b259PlxuXHRcdFx0XHRcdFx0PGJ1dHRvbiBvbkNsaWNrPXt0aGlzLnJlbW92ZVBvcHVwLmJpbmQodGhpcywgdHJ1ZSl9PkdvdCBpdDwvYnV0dG9uPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBTYXZlUmVzdWx0OyIsImNsYXNzIERvd25sb2FkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdwb3B1cC13cmFwcGVyJyxcblx0XHRcdGNvbnRhaW5lcjogJ3BvcHVwLWNvbnRhaW5lcicsXG5cblx0XHRcdGlucHV0SnNvbjogJ2lucHV0SnNvbicsXG5cdFx0fVxuXHR9XG5cblx0cmVtb3ZlU2hvdyhidXR0b25DbGljaywgZXZlbnQpIHtcblx0XHRjb25zdCByZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuYXBwX2hpZGVfcG9wdXAoKSk7XG5cdFx0fVxuXG5cdFx0aWYgKGJ1dHRvbkNsaWNrLnRhcmdldCkgZXZlbnQgPSBidXR0b25DbGljaztcblx0XHRpZiAoYnV0dG9uQ2xpY2sgPT09IHRydWUpIHtcblx0XHRcdHJlbW92ZSgpO1x0XHRcdFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldC5jbGFzc05hbWUgPT09IHRoaXMuc3R5bGVzLndyYXBwZXIpIHtcblx0XHRcdFx0cmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmVuZGVyRG93bmxvYWQoanNvbikge1xuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHQ8aDMgY2xhc3NOYW1lPSd4Zm9udC10aGluJz5Eb3dubG9hZDwvaDM+XG5cdFx0XHQ8aHIgLz5cblx0XHRcdDxwPllvdSBjYW4gZ2V0IHRoaXMgaXRlbSBidWlsZCB0aHJvdWdoIHR3byBtZXRob2RzLCBvbmUgaXMgYnkgZG93bmxvYWRpbmcgaXQgPGEgaHJlZj17Jy9kb3dubG9hZC8nICsgdGhpcy5wcm9wcy5pZCArICcuanNvbid9PmhlcmU8L2E+LjwvcD5cblx0XHRcdDxwPlxuXHRcdFx0XHRPciB0aGUgb3RoZXIgbWV0aG9kIGlzIGNyZWF0aW5nIGEgZmlsZSB3aXRoIHRoZSBuYW1lOlxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGk+e3RoaXMucHJvcHMuaWR9Lmpzb248L2k+XG5cdFx0XHQ8L3A+XG5cdFx0XHQ8cD5cblx0XHRcdFx0VGhlbiBjb3B5IGFuZCBwYXN0ZSB0aGUgYmVsb3cgY29kZSBpbnRvIHRoZSBmaWxlIGFuZCBzYXZlLlxuXHRcdFx0PC9wPlxuXHRcdFx0PHRleHRhcmVhIHJlYWRPbmx5IHZhbHVlPXtqc29ufSBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmlucHV0SnNvbn0+PC90ZXh0YXJlYT5cblx0XHRcdDxociAvPlxuXHRcdFx0PHA+XG5cdFx0XHRcdEFmdGVyIHlvdSBhcmUgZG9uZSB3aXRoIGVpdGhlciBtZXRob2QsIG1vdmUgdGhlIGZpbGUgaW50byB0aGUgYXBwcm9wcmlhdGUgY2hhbXBpb24gZm9sZGVyIHdoZXJlIExlYWd1ZSBPZiBMZWdlbmRzIGlzIGluc3RhbGxlZC5cblx0XHRcdDwvcD5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cblx0cmVuZGVyRXJyKGVycikge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0PGgzPlRoZXJlIHdhcyBhbiBlcnJvcjwvaDM+XG5cdFx0XHRcdDxociAvPlxuXHRcdFx0XHQ8cD5UaGlzIGlzIG1vc3QgbGlrZWx5IGEgYnVnLiBSZXBvcnQgaXQgaWYgcG9zc2libGUgKHNlZSBBYm91dCBzZWN0aW9uKS48L3A+XG5cblx0XHRcdFx0PHA+VGhlIHNwZWNpZmljIGVycm9yIG1lc3NhZ2UgaXM6IHtlcnIudG9TdHJpbmcoKX08L3A+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zaG93KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRsZXQganNvbiwganNvbkVycjtcblx0XHR0cnkge1xuXHRcdFx0anNvbiA9IEpTT04uc3RyaW5naWZ5KHRoaXMucHJvcHMuZGF0YSk7XG5cdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRqc29uRXJyID0gZTtcblx0XHR9XG5cblx0XHRsZXQgbWVzc2FnZTtcblx0XHRpZiAoanNvbkVycikge1xuXHRcdFx0bWVzc2FnZSA9IHRoaXMucmVuZGVyRXJyKGpzb25FcnIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlID0gdGhpcy5yZW5kZXJEb3dubG9hZChqc29uKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfSBvbkNsaWNrPXt0aGlzLnJlbW92ZVNob3cuYmluZCh0aGlzKX0+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY29udGFpbmVyfT5cblx0XHRcdFxuXHRcdFx0XHR7bWVzc2FnZX1cblxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBEb3dubG9hZDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZSA9IHt9O1xudmFyIHN0YXJ0ID0gJyg/Ol58XFxcXHMpJztcbnZhciBlbmQgPSAnKD86XFxcXHN8JCknO1xuXG5mdW5jdGlvbiBsb29rdXBDbGFzcyAoY2xhc3NOYW1lKSB7XG4gIHZhciBjYWNoZWQgPSBjYWNoZVtjbGFzc05hbWVdO1xuICBpZiAoY2FjaGVkKSB7XG4gICAgY2FjaGVkLmxhc3RJbmRleCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgY2FjaGVbY2xhc3NOYW1lXSA9IGNhY2hlZCA9IG5ldyBSZWdFeHAoc3RhcnQgKyBjbGFzc05hbWUgKyBlbmQsICdnJyk7XG4gIH1cbiAgcmV0dXJuIGNhY2hlZDtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MgKGVsLCBjbGFzc05hbWUpIHtcbiAgdmFyIGN1cnJlbnQgPSBlbC5jbGFzc05hbWU7XG4gIGlmICghY3VycmVudC5sZW5ndGgpIHtcbiAgICBlbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIH0gZWxzZSBpZiAoIWxvb2t1cENsYXNzKGNsYXNzTmFtZSkudGVzdChjdXJyZW50KSkge1xuICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcm1DbGFzcyAoZWwsIGNsYXNzTmFtZSkge1xuICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShsb29rdXBDbGFzcyhjbGFzc05hbWUpLCAnICcpLnRyaW0oKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFkZDogYWRkQ2xhc3MsXG4gIHJtOiBybUNsYXNzXG59OyIsIid1c2Ugc3RyaWN0JztcblxuLypcbiAgTW9kaWZpZWQgTCMzNjcsIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXZhY3F1YS9kcmFndWxhXG4gKi9cblxudmFyIGVtaXR0ZXIgPSByZXF1aXJlKCdjb250cmEvZW1pdHRlcicpO1xudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIGNsYXNzZXMgPSByZXF1aXJlKCcuL2NsYXNzZXMnKTtcblxuZnVuY3Rpb24gZHJhZ3VsYSAoaW5pdGlhbENvbnRhaW5lcnMsIG9wdGlvbnMpIHtcbiAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDEgJiYgQXJyYXkuaXNBcnJheShpbml0aWFsQ29udGFpbmVycykgPT09IGZhbHNlKSB7XG4gICAgb3B0aW9ucyA9IGluaXRpYWxDb250YWluZXJzO1xuICAgIGluaXRpYWxDb250YWluZXJzID0gW107XG4gIH1cbiAgdmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICB2YXIgZG9jdW1lbnRFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB2YXIgX21pcnJvcjsgLy8gbWlycm9yIGltYWdlXG4gIHZhciBfc291cmNlOyAvLyBzb3VyY2UgY29udGFpbmVyXG4gIHZhciBfaXRlbTsgLy8gaXRlbSBiZWluZyBkcmFnZ2VkXG4gIHZhciBfb2Zmc2V0WDsgLy8gcmVmZXJlbmNlIHhcbiAgdmFyIF9vZmZzZXRZOyAvLyByZWZlcmVuY2UgeVxuICB2YXIgX2luaXRpYWxTaWJsaW5nOyAvLyByZWZlcmVuY2Ugc2libGluZyB3aGVuIGdyYWJiZWRcbiAgdmFyIF9jdXJyZW50U2libGluZzsgLy8gcmVmZXJlbmNlIHNpYmxpbmcgbm93XG4gIHZhciBfY29weTsgLy8gaXRlbSB1c2VkIGZvciBjb3B5aW5nXG4gIHZhciBfcmVuZGVyVGltZXI7IC8vIHRpbWVyIGZvciBzZXRUaW1lb3V0IHJlbmRlck1pcnJvckltYWdlXG4gIHZhciBfbGFzdERyb3BUYXJnZXQgPSBudWxsOyAvLyBsYXN0IGNvbnRhaW5lciBpdGVtIHdhcyBvdmVyXG4gIHZhciBfZ3JhYmJlZDsgLy8gaG9sZHMgbW91c2Vkb3duIGNvbnRleHQgdW50aWwgZmlyc3QgbW91c2Vtb3ZlXG5cbiAgdmFyIG8gPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoby5tb3ZlcyA9PT0gdm9pZCAwKSB7IG8ubW92ZXMgPSBhbHdheXM7IH1cbiAgaWYgKG8uYWNjZXB0cyA9PT0gdm9pZCAwKSB7IG8uYWNjZXB0cyA9IGFsd2F5czsgfVxuICBpZiAoby5pbnZhbGlkID09PSB2b2lkIDApIHsgby5pbnZhbGlkID0gaW52YWxpZFRhcmdldDsgfVxuICBpZiAoby5jb250YWluZXJzID09PSB2b2lkIDApIHsgby5jb250YWluZXJzID0gaW5pdGlhbENvbnRhaW5lcnMgfHwgW107IH1cbiAgaWYgKG8uaXNDb250YWluZXIgPT09IHZvaWQgMCkgeyBvLmlzQ29udGFpbmVyID0gbmV2ZXI7IH1cbiAgaWYgKG8uY29weSA9PT0gdm9pZCAwKSB7IG8uY29weSA9IGZhbHNlOyB9XG4gIGlmIChvLnJldmVydE9uU3BpbGwgPT09IHZvaWQgMCkgeyBvLnJldmVydE9uU3BpbGwgPSBmYWxzZTsgfVxuICBpZiAoby5yZW1vdmVPblNwaWxsID09PSB2b2lkIDApIHsgby5yZW1vdmVPblNwaWxsID0gZmFsc2U7IH1cbiAgaWYgKG8uZGlyZWN0aW9uID09PSB2b2lkIDApIHsgby5kaXJlY3Rpb24gPSAndmVydGljYWwnOyB9XG4gIGlmIChvLm1pcnJvckNvbnRhaW5lciA9PT0gdm9pZCAwKSB7IG8ubWlycm9yQ29udGFpbmVyID0gYm9keTsgfVxuXG4gIHZhciBkcmFrZSA9IGVtaXR0ZXIoe1xuICAgIGNvbnRhaW5lcnM6IG8uY29udGFpbmVycyxcbiAgICBzdGFydDogbWFudWFsU3RhcnQsXG4gICAgZW5kOiBlbmQsXG4gICAgY2FuY2VsOiBjYW5jZWwsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgZGVzdHJveTogZGVzdHJveSxcbiAgICBkcmFnZ2luZzogZmFsc2VcbiAgfSk7XG5cbiAgaWYgKG8ucmVtb3ZlT25TcGlsbCA9PT0gdHJ1ZSkge1xuICAgIGRyYWtlLm9uKCdvdmVyJywgc3BpbGxPdmVyKS5vbignb3V0Jywgc3BpbGxPdXQpO1xuICB9XG5cbiAgZXZlbnRzKCk7XG5cbiAgcmV0dXJuIGRyYWtlO1xuXG4gIGZ1bmN0aW9uIGlzQ29udGFpbmVyIChlbCkge1xuICAgIHJldHVybiBkcmFrZS5jb250YWluZXJzLmluZGV4T2YoZWwpICE9PSAtMSB8fCBvLmlzQ29udGFpbmVyKGVsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV2ZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ21vdXNlZG93bicsIGdyYWIpO1xuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsIG9wLCAnbW91c2V1cCcsIHJlbGVhc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZXZlbnR1YWxNb3ZlbWVudHMgKHJlbW92ZSkge1xuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XG4gICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgb3AsICdtb3VzZW1vdmUnLCBzdGFydEJlY2F1c2VNb3VzZU1vdmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVtZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ3NlbGVjdHN0YXJ0JywgcHJldmVudEdyYWJiZWQpOyAvLyBJRThcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ2NsaWNrJywgcHJldmVudEdyYWJiZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgZXZlbnRzKHRydWUpO1xuICAgIHJlbGVhc2Uoe30pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldmVudEdyYWJiZWQgKGUpIHtcbiAgICBpZiAoX2dyYWJiZWQpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBncmFiIChlKSB7XG4gICAgdmFyIGlnbm9yZSA9IChlLndoaWNoICE9PSAwICYmIGUud2hpY2ggIT09IDEpIHx8IGUubWV0YUtleSB8fCBlLmN0cmxLZXk7XG4gICAgaWYgKGlnbm9yZSkge1xuICAgICAgcmV0dXJuOyAvLyB3ZSBvbmx5IGNhcmUgYWJvdXQgaG9uZXN0LXRvLWdvZCBsZWZ0IGNsaWNrcyBhbmQgdG91Y2ggZXZlbnRzXG4gICAgfVxuICAgIHZhciBpdGVtID0gZS50YXJnZXQ7XG4gICAgdmFyIGNvbnRleHQgPSBjYW5TdGFydChpdGVtKTtcbiAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2dyYWJiZWQgPSBjb250ZXh0O1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKCk7XG4gICAgaWYgKGUudHlwZSA9PT0gJ21vdXNlZG93bicpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8gZml4ZXMgaHR0cHM6Ly9naXRodWIuY29tL2JldmFjcXVhL2RyYWd1bGEvaXNzdWVzLzE1NVxuICAgICAgaWYgKGl0ZW0udGFnTmFtZSA9PT0gJ0lOUFVUJyB8fCBpdGVtLnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICAgICAgaXRlbS5mb2N1cygpOyAvLyBmaXhlcyBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMTc2XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRCZWNhdXNlTW91c2VNb3ZlZCAoZSkge1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKHRydWUpO1xuICAgIG1vdmVtZW50cygpO1xuICAgIGVuZCgpO1xuICAgIHN0YXJ0KF9ncmFiYmVkKTtcblxuICAgIHZhciBvZmZzZXQgPSBnZXRPZmZzZXQoX2l0ZW0pO1xuICAgIF9vZmZzZXRYID0gZ2V0Q29vcmQoJ3BhZ2VYJywgZSkgLSBvZmZzZXQubGVmdDtcbiAgICBfb2Zmc2V0WSA9IGdldENvb3JkKCdwYWdlWScsIGUpIC0gb2Zmc2V0LnRvcDtcblxuICAgIGNsYXNzZXMuYWRkKF9jb3B5IHx8IF9pdGVtLCAnZ3UtdHJhbnNpdCcpO1xuICAgIHJlbmRlck1pcnJvckltYWdlKCk7XG4gICAgZHJhZyhlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhblN0YXJ0IChpdGVtKSB7XG4gICAgaWYgKGRyYWtlLmRyYWdnaW5nICYmIF9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzQ29udGFpbmVyKGl0ZW0pKSB7XG4gICAgICByZXR1cm47IC8vIGRvbid0IGRyYWcgY29udGFpbmVyIGl0c2VsZlxuICAgIH1cbiAgICB2YXIgaGFuZGxlID0gaXRlbTtcbiAgICB3aGlsZSAoaXRlbS5wYXJlbnRFbGVtZW50ICYmIGlzQ29udGFpbmVyKGl0ZW0ucGFyZW50RWxlbWVudCkgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoby5pbnZhbGlkKGl0ZW0sIGhhbmRsZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaXRlbSA9IGl0ZW0ucGFyZW50RWxlbWVudDsgLy8gZHJhZyB0YXJnZXQgc2hvdWxkIGJlIGEgdG9wIGVsZW1lbnRcbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBzb3VyY2UgPSBpdGVtLnBhcmVudEVsZW1lbnQ7XG4gICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG8uaW52YWxpZChpdGVtLCBoYW5kbGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG1vdmFibGUgPSBvLm1vdmVzKGl0ZW0sIHNvdXJjZSwgaGFuZGxlKTtcbiAgICBpZiAoIW1vdmFibGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaXRlbTogaXRlbSxcbiAgICAgIHNvdXJjZTogc291cmNlXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1hbnVhbFN0YXJ0IChpdGVtKSB7XG4gICAgdmFyIGNvbnRleHQgPSBjYW5TdGFydChpdGVtKTtcbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgc3RhcnQoY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQgKGNvbnRleHQpIHtcbiAgICBpZiAoby5jb3B5KSB7XG4gICAgICBfY29weSA9IGNvbnRleHQuaXRlbS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICBkcmFrZS5lbWl0KCdjbG9uZWQnLCBfY29weSwgY29udGV4dC5pdGVtLCAnY29weScpO1xuICAgIH1cblxuICAgIF9zb3VyY2UgPSBjb250ZXh0LnNvdXJjZTtcbiAgICBfaXRlbSA9IGNvbnRleHQuaXRlbTtcbiAgICBfaW5pdGlhbFNpYmxpbmcgPSBfY3VycmVudFNpYmxpbmcgPSBuZXh0RWwoY29udGV4dC5pdGVtKTtcblxuICAgIGRyYWtlLmRyYWdnaW5nID0gdHJ1ZTtcbiAgICBkcmFrZS5lbWl0KCdkcmFnJywgX2l0ZW0sIF9zb3VyY2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gaW52YWxpZFRhcmdldCAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gZW5kICgpIHtcbiAgICBpZiAoIWRyYWtlLmRyYWdnaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgZHJvcChpdGVtLCBpdGVtLnBhcmVudEVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5ncmFiICgpIHtcbiAgICBfZ3JhYmJlZCA9IGZhbHNlO1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKHRydWUpO1xuICAgIG1vdmVtZW50cyh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbGVhc2UgKGUpIHtcbiAgICB1bmdyYWIoKTtcblxuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICB2YXIgY2xpZW50WCA9IGdldENvb3JkKCdjbGllbnRYJywgZSk7XG4gICAgdmFyIGNsaWVudFkgPSBnZXRDb29yZCgnY2xpZW50WScsIGUpO1xuICAgIHZhciBlbGVtZW50QmVoaW5kQ3Vyc29yID0gZ2V0RWxlbWVudEJlaGluZFBvaW50KF9taXJyb3IsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIHZhciBkcm9wVGFyZ2V0ID0gZmluZERyb3BUYXJnZXQoZWxlbWVudEJlaGluZEN1cnNvciwgY2xpZW50WCwgY2xpZW50WSk7XG4gICAgaWYgKGRyb3BUYXJnZXQgJiYgKG8uY29weSA9PT0gZmFsc2UgfHwgZHJvcFRhcmdldCAhPT0gX3NvdXJjZSkpIHtcbiAgICAgIGRyb3AoaXRlbSwgZHJvcFRhcmdldCk7XG4gICAgfSBlbHNlIGlmIChvLnJlbW92ZU9uU3BpbGwpIHtcbiAgICAgIHJlbW92ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYW5jZWwoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkcm9wIChpdGVtLCB0YXJnZXQpIHtcbiAgICBpZiAoaXNJbml0aWFsUGxhY2VtZW50KHRhcmdldCkpIHtcbiAgICAgIGRyYWtlLmVtaXQoJ2NhbmNlbCcsIGl0ZW0sIF9zb3VyY2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkcmFrZS5lbWl0KCdkcm9wJywgaXRlbSwgdGFyZ2V0LCBfc291cmNlKTtcbiAgICB9XG4gICAgY2xlYW51cCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlICgpIHtcbiAgICBpZiAoIWRyYWtlLmRyYWdnaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgdmFyIHBhcmVudCA9IGl0ZW0ucGFyZW50RWxlbWVudDtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgfVxuICAgIGRyYWtlLmVtaXQoby5jb3B5ID8gJ2NhbmNlbCcgOiAncmVtb3ZlJywgaXRlbSwgcGFyZW50KTtcbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5jZWwgKHJldmVydCkge1xuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldmVydHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMCA/IHJldmVydCA6IG8ucmV2ZXJ0T25TcGlsbDtcbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBwYXJlbnQgPSBpdGVtLnBhcmVudEVsZW1lbnQ7XG4gICAgaWYgKHBhcmVudCA9PT0gX3NvdXJjZSAmJiBvLmNvcHkpIHtcbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChfY29weSk7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXNJbml0aWFsUGxhY2VtZW50KHBhcmVudCk7XG4gICAgaWYgKGluaXRpYWwgPT09IGZhbHNlICYmIG8uY29weSA9PT0gZmFsc2UgJiYgcmV2ZXJ0cykge1xuICAgICAgX3NvdXJjZS5pbnNlcnRCZWZvcmUoaXRlbSwgX2luaXRpYWxTaWJsaW5nKTtcbiAgICB9XG4gICAgaWYgKGluaXRpYWwgfHwgcmV2ZXJ0cykge1xuICAgICAgZHJha2UuZW1pdCgnY2FuY2VsJywgaXRlbSwgX3NvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRyYWtlLmVtaXQoJ2Ryb3AnLCBpdGVtLCBwYXJlbnQsIF9zb3VyY2UpO1xuICAgIH1cbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhbnVwICgpIHtcbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHVuZ3JhYigpO1xuICAgIHJlbW92ZU1pcnJvckltYWdlKCk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIGNsYXNzZXMucm0oaXRlbSwgJ2d1LXRyYW5zaXQnKTtcbiAgICB9XG4gICAgaWYgKF9yZW5kZXJUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KF9yZW5kZXJUaW1lcik7XG4gICAgfVxuICAgIGRyYWtlLmRyYWdnaW5nID0gZmFsc2U7XG4gICAgZHJha2UuZW1pdCgnb3V0JywgaXRlbSwgX2xhc3REcm9wVGFyZ2V0LCBfc291cmNlKTtcbiAgICBkcmFrZS5lbWl0KCdkcmFnZW5kJywgaXRlbSk7XG4gICAgX3NvdXJjZSA9IF9pdGVtID0gX2NvcHkgPSBfaW5pdGlhbFNpYmxpbmcgPSBfY3VycmVudFNpYmxpbmcgPSBfcmVuZGVyVGltZXIgPSBfbGFzdERyb3BUYXJnZXQgPSBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJbml0aWFsUGxhY2VtZW50ICh0YXJnZXQsIHMpIHtcbiAgICB2YXIgc2libGluZztcbiAgICBpZiAocyAhPT0gdm9pZCAwKSB7XG4gICAgICBzaWJsaW5nID0gcztcbiAgICB9IGVsc2UgaWYgKF9taXJyb3IpIHtcbiAgICAgIHNpYmxpbmcgPSBfY3VycmVudFNpYmxpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNpYmxpbmcgPSBuZXh0RWwoX2NvcHkgfHwgX2l0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0ID09PSBfc291cmNlICYmIHNpYmxpbmcgPT09IF9pbml0aWFsU2libGluZztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmREcm9wVGFyZ2V0IChlbGVtZW50QmVoaW5kQ3Vyc29yLCBjbGllbnRYLCBjbGllbnRZKSB7XG4gICAgdmFyIHRhcmdldCA9IGVsZW1lbnRCZWhpbmRDdXJzb3I7XG4gICAgd2hpbGUgKHRhcmdldCAmJiAhYWNjZXB0ZWQoKSkge1xuICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG5cbiAgICBmdW5jdGlvbiBhY2NlcHRlZCAoKSB7XG4gICAgICB2YXIgZHJvcHBhYmxlID0gaXNDb250YWluZXIodGFyZ2V0KTtcbiAgICAgIGlmIChkcm9wcGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGltbWVkaWF0ZSA9IGdldEltbWVkaWF0ZUNoaWxkKHRhcmdldCwgZWxlbWVudEJlaGluZEN1cnNvcik7XG4gICAgICB2YXIgcmVmZXJlbmNlID0gZ2V0UmVmZXJlbmNlKHRhcmdldCwgaW1tZWRpYXRlLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICAgIHZhciBpbml0aWFsID0gaXNJbml0aWFsUGxhY2VtZW50KHRhcmdldCwgcmVmZXJlbmNlKTtcbiAgICAgIGlmIChpbml0aWFsKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBzaG91bGQgYWx3YXlzIGJlIGFibGUgdG8gZHJvcCBpdCByaWdodCBiYWNrIHdoZXJlIGl0IHdhc1xuICAgICAgfVxuICAgICAgcmV0dXJuIG8uYWNjZXB0cyhfaXRlbSwgdGFyZ2V0LCBfc291cmNlLCByZWZlcmVuY2UpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRyYWcgKGUpIHtcbiAgICBpZiAoIV9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIGNsaWVudFggPSBnZXRDb29yZCgnY2xpZW50WCcsIGUpO1xuICAgIHZhciBjbGllbnRZID0gZ2V0Q29vcmQoJ2NsaWVudFknLCBlKTtcbiAgICB2YXIgeCA9IGNsaWVudFggLSBfb2Zmc2V0WDtcbiAgICB2YXIgeSA9IGNsaWVudFkgLSBfb2Zmc2V0WTtcblxuICAgIF9taXJyb3Iuc3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgIF9taXJyb3Iuc3R5bGUudG9wICA9IHkgKyAncHgnO1xuXG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICB2YXIgZWxlbWVudEJlaGluZEN1cnNvciA9IGdldEVsZW1lbnRCZWhpbmRQb2ludChfbWlycm9yLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICB2YXIgZHJvcFRhcmdldCA9IGZpbmREcm9wVGFyZ2V0KGVsZW1lbnRCZWhpbmRDdXJzb3IsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIHZhciBjaGFuZ2VkID0gZHJvcFRhcmdldCAhPT0gbnVsbCAmJiBkcm9wVGFyZ2V0ICE9PSBfbGFzdERyb3BUYXJnZXQ7XG4gICAgaWYgKGNoYW5nZWQgfHwgZHJvcFRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgb3V0KCk7XG4gICAgICBfbGFzdERyb3BUYXJnZXQgPSBkcm9wVGFyZ2V0O1xuICAgICAgb3ZlcigpO1xuICAgIH1cbiAgICBpZiAoZHJvcFRhcmdldCA9PT0gX3NvdXJjZSAmJiBvLmNvcHkpIHtcbiAgICAgIGlmIChpdGVtLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgaXRlbS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGl0ZW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVmZXJlbmNlO1xuICAgIHZhciBpbW1lZGlhdGUgPSBnZXRJbW1lZGlhdGVDaGlsZChkcm9wVGFyZ2V0LCBlbGVtZW50QmVoaW5kQ3Vyc29yKTtcbiAgICBpZiAoaW1tZWRpYXRlICE9PSBudWxsKSB7XG4gICAgICByZWZlcmVuY2UgPSBnZXRSZWZlcmVuY2UoZHJvcFRhcmdldCwgaW1tZWRpYXRlLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICB9IGVsc2UgaWYgKG8ucmV2ZXJ0T25TcGlsbCA9PT0gdHJ1ZSAmJiAhby5jb3B5KSB7XG4gICAgICByZWZlcmVuY2UgPSBfaW5pdGlhbFNpYmxpbmc7XG4gICAgICBkcm9wVGFyZ2V0ID0gX3NvdXJjZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG8uY29weSAmJiBpdGVtLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgaXRlbS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGl0ZW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICByZWZlcmVuY2UgPT09IG51bGwgfHxcbiAgICAgIHJlZmVyZW5jZSAhPT0gaXRlbSAmJlxuICAgICAgcmVmZXJlbmNlICE9PSBuZXh0RWwoaXRlbSkgJiZcbiAgICAgIHJlZmVyZW5jZSAhPT0gX2N1cnJlbnRTaWJsaW5nXG4gICAgKSB7XG4gICAgICBfY3VycmVudFNpYmxpbmcgPSByZWZlcmVuY2U7XG4gICAgICAvL2Ryb3BUYXJnZXQuaW5zZXJ0QmVmb3JlKGl0ZW0sIHJlZmVyZW5jZSk7XG4gICAgICBkcmFrZS5lbWl0KCdzaGFkb3cnLCBpdGVtLCBkcm9wVGFyZ2V0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbW92ZWQgKHR5cGUpIHsgZHJha2UuZW1pdCh0eXBlLCBpdGVtLCBfbGFzdERyb3BUYXJnZXQsIF9zb3VyY2UpOyB9XG4gICAgZnVuY3Rpb24gb3ZlciAoKSB7IGlmIChjaGFuZ2VkKSB7IG1vdmVkKCdvdmVyJyk7IH0gfVxuICAgIGZ1bmN0aW9uIG91dCAoKSB7IGlmIChfbGFzdERyb3BUYXJnZXQpIHsgbW92ZWQoJ291dCcpOyB9IH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNwaWxsT3ZlciAoZWwpIHtcbiAgICBjbGFzc2VzLnJtKGVsLCAnZ3UtaGlkZScpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3BpbGxPdXQgKGVsKSB7XG4gICAgaWYgKGRyYWtlLmRyYWdnaW5nKSB7IGNsYXNzZXMuYWRkKGVsLCAnZ3UtaGlkZScpOyB9XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJNaXJyb3JJbWFnZSAoKSB7XG4gICAgaWYgKF9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlY3QgPSBfaXRlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBfbWlycm9yID0gX2l0ZW0uY2xvbmVOb2RlKHRydWUpO1xuICAgIF9taXJyb3Iuc3R5bGUud2lkdGggPSBnZXRSZWN0V2lkdGgocmVjdCkgKyAncHgnO1xuICAgIF9taXJyb3Iuc3R5bGUuaGVpZ2h0ID0gZ2V0UmVjdEhlaWdodChyZWN0KSArICdweCc7XG4gICAgY2xhc3Nlcy5ybShfbWlycm9yLCAnZ3UtdHJhbnNpdCcpO1xuICAgIGNsYXNzZXMuYWRkKF9taXJyb3IsICdndS1taXJyb3InKTtcbiAgICBvLm1pcnJvckNvbnRhaW5lci5hcHBlbmRDaGlsZChfbWlycm9yKTtcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCAnYWRkJywgJ21vdXNlbW92ZScsIGRyYWcpO1xuICAgIGNsYXNzZXMuYWRkKG8ubWlycm9yQ29udGFpbmVyLCAnZ3UtdW5zZWxlY3RhYmxlJyk7XG4gICAgZHJha2UuZW1pdCgnY2xvbmVkJywgX21pcnJvciwgX2l0ZW0sICdtaXJyb3InKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZU1pcnJvckltYWdlICgpIHtcbiAgICBpZiAoX21pcnJvcikge1xuICAgICAgY2xhc3Nlcy5ybShvLm1pcnJvckNvbnRhaW5lciwgJ2d1LXVuc2VsZWN0YWJsZScpO1xuICAgICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgJ3JlbW92ZScsICdtb3VzZW1vdmUnLCBkcmFnKTtcbiAgICAgIF9taXJyb3IucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChfbWlycm9yKTtcbiAgICAgIF9taXJyb3IgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEltbWVkaWF0ZUNoaWxkIChkcm9wVGFyZ2V0LCB0YXJnZXQpIHtcbiAgICB2YXIgaW1tZWRpYXRlID0gdGFyZ2V0O1xuICAgIHdoaWxlIChpbW1lZGlhdGUgIT09IGRyb3BUYXJnZXQgJiYgaW1tZWRpYXRlLnBhcmVudEVsZW1lbnQgIT09IGRyb3BUYXJnZXQpIHtcbiAgICAgIGltbWVkaWF0ZSA9IGltbWVkaWF0ZS5wYXJlbnRFbGVtZW50O1xuICAgIH1cbiAgICBpZiAoaW1tZWRpYXRlID09PSBkb2N1bWVudEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gaW1tZWRpYXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVmZXJlbmNlIChkcm9wVGFyZ2V0LCB0YXJnZXQsIHgsIHkpIHtcbiAgICB2YXIgaG9yaXpvbnRhbCA9IG8uZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCc7XG4gICAgdmFyIHJlZmVyZW5jZSA9IHRhcmdldCAhPT0gZHJvcFRhcmdldCA/IGluc2lkZSgpIDogb3V0c2lkZSgpO1xuICAgIHJldHVybiByZWZlcmVuY2U7XG5cbiAgICBmdW5jdGlvbiBvdXRzaWRlICgpIHsgLy8gc2xvd2VyLCBidXQgYWJsZSB0byBmaWd1cmUgb3V0IGFueSBwb3NpdGlvblxuICAgICAgdmFyIGxlbiA9IGRyb3BUYXJnZXQuY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgdmFyIGk7XG4gICAgICB2YXIgZWw7XG4gICAgICB2YXIgcmVjdDtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBlbCA9IGRyb3BUYXJnZXQuY2hpbGRyZW5baV07XG4gICAgICAgIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgaWYgKGhvcml6b250YWwgJiYgcmVjdC5sZWZ0ID4geCkgeyByZXR1cm4gZWw7IH1cbiAgICAgICAgaWYgKCFob3Jpem9udGFsICYmIHJlY3QudG9wID4geSkgeyByZXR1cm4gZWw7IH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2lkZSAoKSB7IC8vIGZhc3RlciwgYnV0IG9ubHkgYXZhaWxhYmxlIGlmIGRyb3BwZWQgaW5zaWRlIGEgY2hpbGQgZWxlbWVudFxuICAgICAgdmFyIHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBpZiAoaG9yaXpvbnRhbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZSh4ID4gcmVjdC5sZWZ0ICsgZ2V0UmVjdFdpZHRoKHJlY3QpIC8gMik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb2x2ZSh5ID4gcmVjdC50b3AgKyBnZXRSZWN0SGVpZ2h0KHJlY3QpIC8gMik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZSAoYWZ0ZXIpIHtcbiAgICAgIHJldHVybiBhZnRlciA/IG5leHRFbCh0YXJnZXQpIDogdGFyZ2V0O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0b3VjaHkgKGVsLCBvcCwgdHlwZSwgZm4pIHtcbiAgdmFyIHRvdWNoID0ge1xuICAgIG1vdXNldXA6ICd0b3VjaGVuZCcsXG4gICAgbW91c2Vkb3duOiAndG91Y2hzdGFydCcsXG4gICAgbW91c2Vtb3ZlOiAndG91Y2htb3ZlJ1xuICB9O1xuICB2YXIgbWljcm9zb2Z0ID0ge1xuICAgIG1vdXNldXA6ICdNU1BvaW50ZXJVcCcsXG4gICAgbW91c2Vkb3duOiAnTVNQb2ludGVyRG93bicsXG4gICAgbW91c2Vtb3ZlOiAnTVNQb2ludGVyTW92ZSdcbiAgfTtcbiAgaWYgKGdsb2JhbC5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZCkge1xuICAgIGNyb3NzdmVudFtvcF0oZWwsIG1pY3Jvc29mdFt0eXBlXSwgZm4pO1xuICB9XG4gIGNyb3NzdmVudFtvcF0oZWwsIHRvdWNoW3R5cGVdLCBmbik7XG4gIGNyb3NzdmVudFtvcF0oZWwsIHR5cGUsIGZuKTtcbn1cblxuZnVuY3Rpb24gZ2V0T2Zmc2V0IChlbCkge1xuICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IHJlY3QubGVmdCArIGdldFNjcm9sbCgnc2Nyb2xsTGVmdCcsICdwYWdlWE9mZnNldCcpLFxuICAgIHRvcDogcmVjdC50b3AgKyBnZXRTY3JvbGwoJ3Njcm9sbFRvcCcsICdwYWdlWU9mZnNldCcpXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFNjcm9sbCAoc2Nyb2xsUHJvcCwgb2Zmc2V0UHJvcCkge1xuICBpZiAodHlwZW9mIGdsb2JhbFtvZmZzZXRQcm9wXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZ2xvYmFsW29mZnNldFByb3BdO1xuICB9XG4gIHZhciBkb2N1bWVudEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmIChkb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50RWxlbWVudFtzY3JvbGxQcm9wXTtcbiAgfVxuICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIHJldHVybiBib2R5W3Njcm9sbFByb3BdO1xufVxuXG5mdW5jdGlvbiBnZXRFbGVtZW50QmVoaW5kUG9pbnQgKHBvaW50LCB4LCB5KSB7XG4gIHZhciBwID0gcG9pbnQgfHwge307XG4gIHZhciBzdGF0ZSA9IHAuY2xhc3NOYW1lO1xuICB2YXIgZWw7XG4gIHAuY2xhc3NOYW1lICs9ICcgZ3UtaGlkZSc7XG4gIGVsID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludCh4LCB5KTtcbiAgcC5jbGFzc05hbWUgPSBzdGF0ZTtcbiAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBuZXZlciAoKSB7IHJldHVybiBmYWxzZTsgfVxuZnVuY3Rpb24gYWx3YXlzICgpIHsgcmV0dXJuIHRydWU7IH1cblxuZnVuY3Rpb24gbmV4dEVsIChlbCkge1xuICByZXR1cm4gZWwubmV4dEVsZW1lbnRTaWJsaW5nIHx8IG1hbnVhbGx5KCk7XG4gIGZ1bmN0aW9uIG1hbnVhbGx5ICgpIHtcbiAgICB2YXIgc2libGluZyA9IGVsO1xuICAgIGRvIHtcbiAgICAgIHNpYmxpbmcgPSBzaWJsaW5nLm5leHRTaWJsaW5nO1xuICAgIH0gd2hpbGUgKHNpYmxpbmcgJiYgc2libGluZy5ub2RlVHlwZSAhPT0gMSk7XG4gICAgcmV0dXJuIHNpYmxpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RXZlbnRIb3N0IChlKSB7XG4gIC8vIG9uIHRvdWNoZW5kIGV2ZW50LCB3ZSBoYXZlIHRvIHVzZSBgZS5jaGFuZ2VkVG91Y2hlc2BcbiAgLy8gc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzE5MjU2My90b3VjaGVuZC1ldmVudC1wcm9wZXJ0aWVzXG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMzRcbiAgaWYgKGUudGFyZ2V0VG91Y2hlcyAmJiBlLnRhcmdldFRvdWNoZXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGUudGFyZ2V0VG91Y2hlc1swXTtcbiAgfVxuICBpZiAoZS5jaGFuZ2VkVG91Y2hlcyAmJiBlLmNoYW5nZWRUb3VjaGVzLmxlbmd0aCkge1xuICAgIHJldHVybiBlLmNoYW5nZWRUb3VjaGVzWzBdO1xuICB9XG4gIHJldHVybiBlO1xufVxuXG5mdW5jdGlvbiBnZXRDb29yZCAoY29vcmQsIGUpIHtcbiAgdmFyIGhvc3QgPSBnZXRFdmVudEhvc3QoZSk7XG4gIHZhciBtaXNzTWFwID0ge1xuICAgIHBhZ2VYOiAnY2xpZW50WCcsIC8vIElFOFxuICAgIHBhZ2VZOiAnY2xpZW50WScgLy8gSUU4XG4gIH07XG4gIGlmIChjb29yZCBpbiBtaXNzTWFwICYmICEoY29vcmQgaW4gaG9zdCkgJiYgbWlzc01hcFtjb29yZF0gaW4gaG9zdCkge1xuICAgIGNvb3JkID0gbWlzc01hcFtjb29yZF07XG4gIH1cbiAgcmV0dXJuIGhvc3RbY29vcmRdO1xufVxuXG5mdW5jdGlvbiBnZXRSZWN0V2lkdGggKHJlY3QpIHtcbiAgcmV0dXJuIHJlY3Qud2lkdGggfHwgKHJlY3QucmlnaHQgLSByZWN0LmxlZnQpO1xufVxuXG5mdW5jdGlvbiBnZXRSZWN0SGVpZ2h0IChyZWN0KSB7XG4gIHJldHVybiByZWN0LmhlaWdodCB8fCAocmVjdC5ib3R0b20gLSByZWN0LnRvcCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZHJhZ3VsYTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRyYWd1bGEgPSByZXF1aXJlKCcuL2RyYWd1bGEnKTtcbnZhciBhdG9hID0gcmVxdWlyZSgnYXRvYScpO1xuXG5mdW5jdGlvbiByZWFjdERyYWd1bGEgKCkge1xuICByZXR1cm4gZHJhZ3VsYS5hcHBseSh0aGlzLCBhdG9hKGFyZ3VtZW50cykpLm9uKCdjbG9uZWQnLCBjbG9uZWQpO1xuXG4gIGZ1bmN0aW9uIGNsb25lZCAoY2xvbmUpIHtcbiAgICBybShjbG9uZSk7XG4gICAgYXRvYShjbG9uZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpKS5mb3JFYWNoKHJtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJtIChlbCkge1xuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1yZWFjdGlkJyk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZWFjdERyYWd1bGE7IiwiY2xhc3MgSW5mbyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHR3cmFwcGVyOiAncG9wdXAtd3JhcHBlcicsXG5cdFx0XHRjb250YWluZXI6ICdwb3B1cC1jb250YWluZXInLFxuXG5cdFx0fVxuXHR9XG5cblx0cmVtb3ZlU2hvdyhidXR0b25DbGljaywgZXZlbnQpIHtcblx0XHRjb25zdCByZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuYXBwX2hpZGVfcG9wdXAoKSk7XG5cdFx0fVxuXG5cdFx0aWYgKGJ1dHRvbkNsaWNrLnRhcmdldCkgZXZlbnQgPSBidXR0b25DbGljaztcblx0XHRpZiAoYnV0dG9uQ2xpY2sgPT09IHRydWUpIHtcblx0XHRcdHJlbW92ZSgpO1x0XHRcdFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldC5jbGFzc05hbWUgPT09IHRoaXMuc3R5bGVzLndyYXBwZXIpIHtcblx0XHRcdFx0cmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zaG93KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfSBvbkNsaWNrPXt0aGlzLnJlbW92ZVNob3cuYmluZCh0aGlzKX0+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY29udGFpbmVyfT5cblx0XHRcdFxuXHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdDxoMz5JdGVtIEJ1aWxkZXI8L2gzPlxuXHRcdFx0XHRcdDxwPlxuXHRcdFx0XHRcdFx0VGhpcyBwcm9qZWN0IGlzIGFuIG9wZW4gc291cmNlIHByb2plY3QsIHlvdSBjYW4gdmlldyB0aGUgY29kZSBvbiA8YSBocmVmPSdodHRwOi8vZ2l0aHViLmNvbS9obnJ5L2l0ZW1idWlsZGVyJyB0YXJnZXQ9J19ibGFuayc+R2l0SHViPC9hPlxuXHRcdFx0XHRcdDwvcD5cblx0XHRcdFx0XHQ8cD5cblx0XHRcdFx0XHRcdEl0IHdhcyBjcmVhdGVkIGFzIHBhcnQgb2YgdGhlIFJpb3QgMi4wIEFQSSBjaGFsbGVuZ2UuXG5cdFx0XHRcdFx0PC9wPlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHRcdFx0PHNtYWxsPkl0ZW0gQnVpbGRlciBpc24ndCBlbmRvcnNlZCBieSBSaW90IEdhbWVzIGFuZCBkb2Vzbid0IHJlZmxlY3QgdGhlIHZpZXdzIG9yIG9waW5pb25zIG9mIFJpb3QgR2FtZXMgb3IgYW55b25lIG9mZmljaWFsbHkgaW52b2x2ZWQgaW4gcHJvZHVjaW5nIG9yIG1hbmFnaW5nIExlYWd1ZSBvZiBMZWdlbmRzLiBMZWFndWUgb2YgTGVnZW5kcyBhbmQgUmlvdCBHYW1lcyBhcmUgdHJhZGVtYXJrcyBvciByZWdpc3RlcmVkIHRyYWRlbWFya3Mgb2YgUmlvdCBHYW1lcywgSW5jLiBMZWFndWUgb2YgTGVnZW5kcyDCqSBSaW90IEdhbWVzLCBJbmMuPC9zbWFsbD5cblx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5mbztcbiIsIi8qXG5cdG9uSG92ZXIgYW5kIGRpc3BsYXkgSXRlbSBpY29uIGltYWdlXG4gKi9cblxuY2xhc3MgSXRlbUJ1dHRvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHBvcHVwSGlkZTogJ2l0ZW0tcG9wLWhpZGUnLFxuXHRcdFx0cG9wdXBTaG93OiAnaXRlbS1wb3Atc2hvdycsXG5cdFx0XHRwb3B1cDogJ2l0ZW0tcG9wJ1xuXHRcdH07XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0cG9wdXA6IGZhbHNlLFxuXHRcdFx0aXRlbToge31cblx0XHR9O1xuXG5cdFx0dGhpcy50b2tlbiA9IDA7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRsZXQgaXRlbTtcblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblxuXHRcdHRoaXMudG9rZW4gPSBJdGVtU3RvcmUubm90aWZ5KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRoYXQucHJvcHMuaXRlbSkge1xuXHRcdFx0XHRpdGVtID0gdGhhdC5wcm9wcy5pdGVtO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlbSA9IEl0ZW1TdG9yZS5nZXRCeUlkKHRoYXQucHJvcHMuaXRlbUlkKTtcblx0XHRcdH1cblx0XHRcdHRoYXQuc2V0U3RhdGUoeyBpdGVtOiBpdGVtIH0pO1x0XHRcblx0XHR9KTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEl0ZW1TdG9yZS51bm5vdGlmeSh0aGlzLnRva2VuKTtcblx0fVxuXG5cdGhhbmRsZUhvdmVyT24oKSB7XG5cdFx0Ly9jb25zb2xlLmxvZyh0aGlzLnN0YXRlLml0ZW0pO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBwb3B1cDogdHJ1ZSB9KTtcblx0fVxuXG5cdGhhbmRsZUhvdmVyT2ZmKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBwb3B1cDogZmFsc2UgfSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0aWYgKCF0aGlzLnN0YXRlLml0ZW0gfHwgT2JqZWN0LmtleXModGhpcy5zdGF0ZS5pdGVtKS5sZW5ndGggPCAxKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0bGV0IHBvcFVwRGlzcGxheSA9IHRoaXMuc3R5bGVzLnBvcHVwSGlkZTtcblx0XHRpZiAodGhpcy5zdGF0ZS5wb3B1cCkgcG9wVXBEaXNwbGF5ID0gdGhpcy5zdHlsZXMucG9wdXBTaG93O1xuXG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGRhdGEtaXRlbS1pZD17dGhpcy5zdGF0ZS5pdGVtLmlkfT5cblx0XHRcdDxpbWcgc3JjPXt0aGlzLnN0YXRlLml0ZW0uZ2V0SW1hZ2UoKX0gb25Nb3VzZUVudGVyPXt0aGlzLmhhbmRsZUhvdmVyT24uYmluZCh0aGlzKX0gb25Nb3VzZUxlYXZlPXt0aGlzLmhhbmRsZUhvdmVyT2ZmLmJpbmQodGhpcyl9IC8+XG5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy5wb3B1cCArICcgJyArIHBvcFVwRGlzcGxheX0+XG5cdFx0XHRcdHt0aGlzLnN0YXRlLml0ZW0ubmFtZX1cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdHt0aGlzLnN0YXRlLml0ZW0uZGVzY3JpcHRpb259XG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHR7dGhpcy5zdGF0ZS5pdGVtLmdvbGQuYmFzZX0gPGltZyBzcmM9J2h0dHA6Ly9kZHJhZ29uLmxlYWd1ZW9mbGVnZW5kcy5jb20vY2RuLzUuNS4xL2ltZy91aS9nb2xkLnBuZycgLz5cblx0XHRcdDwvZGl2PlxuXG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1CdXR0b247IiwiY2xhc3MgU2hhcmUgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ3BvcHVwLXdyYXBwZXInLFxuXHRcdFx0Y29udGFpbmVyOiAncG9wdXAtY29udGFpbmVyJyxcblxuXHRcdFx0c2hhcmVDb250YWluZXI6ICdzaGFyZS1tb2RhbCdcblx0XHR9XG5cdH1cblxuXHRyZW1vdmVTaG93KGJ1dHRvbkNsaWNrLCBldmVudCkge1xuXHRcdGNvbnN0IHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5hcHBfaGlkZV9wb3B1cCgpKTtcblx0XHR9XG5cblx0XHRpZiAoYnV0dG9uQ2xpY2sudGFyZ2V0KSBldmVudCA9IGJ1dHRvbkNsaWNrO1xuXHRcdGlmIChidXR0b25DbGljayA9PT0gdHJ1ZSkge1xuXHRcdFx0cmVtb3ZlKCk7XHRcdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSA9PT0gdGhpcy5zdHlsZXMud3JhcHBlcikge1xuXHRcdFx0XHRyZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0Ly8gVE9ET1xuXHRcdC8vIGlmIHVzaW5nIEhUTUw1IGZhbGxiYWNrICgvIy8pXG5cdFx0Ly8gdGhpcy5jb250ZXh0LnJvdXRlci5tYWtlSHJlZiByZXR1cm5zICMvXG5cdFx0Ly8gc28gaGF2ZSB0byBwcmVwZW5kIGEgJy8nIGluIHRoaXMgY2FzZVxuXHRcdGNvbnN0IGxpbmsgPSAnaHR0cDovLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIHRoaXMuY29udGV4dC5yb3V0ZXIubWFrZUhyZWYoJ3ZpZXcnLCB7IGlkOiB0aGlzLnByb3BzLmlkIH0pO1xuXG5cdFx0aWYgKCF0aGlzLnByb3BzLnNob3cpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9IG9uQ2xpY2s9e3RoaXMucmVtb3ZlU2hvdy5iaW5kKHRoaXMpfT5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5jb250YWluZXJ9PlxuXHRcdFx0XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuc2hhcmVDb250YWluZXJ9PlxuXHRcdFx0XHQ8aDMgY2xhc3NOYW1lPSd4Zm9udC10aGluJz5TaGFyZTwvaDM+XG5cdFx0XHRcdDxociAvPlxuXHRcdFx0XHRTaGFyZSB5b3VyIGl0ZW0gYnVpbGQgd2l0aCBvdGhlcnMgdXNpbmcgdGhpcyBsaW5rOlxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGlucHV0IHR5cGU9J3RleHQnIGRlZmF1bHRWYWx1ZT17bGlua30gcmVhZE9ubHkgLz5cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHRPciBzaGFyZSBpdCBvbiB5b3VyIHNvY2lhbCBtZWRpYSxcblx0XHRcdDwvZGl2PlxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59XG5cblNoYXJlLmNvbnRleHRUeXBlcyA9IHtcblx0cm91dGVyOiBSZWFjdC5Qcm9wVHlwZXMuZnVuY1xufVxuXG5leHBvcnQgZGVmYXVsdCBTaGFyZTsiLCJpbXBvcnQgVmlld0J1aWxkIGZyb20gJy4vdmlld0J1aWxkJztcbmltcG9ydCBWaWV3RGlzcGxheSBmcm9tICcuL3ZpZXdEaXNwbGF5JztcbmltcG9ydCBJdGVtQnV0dG9uIGZyb20gJy4uL2l0ZW1CdXR0b24nO1xuXG5pbXBvcnQgU2hhcmUgZnJvbSAnLi4vc2hhcmUnO1xuaW1wb3J0IERvd25sb2FkIGZyb20gJy4uL2Rvd25sb2FkJztcbmltcG9ydCBJbmZvIGZyb20gJy4uL2luZm8nO1xuXG5jbGFzcyBWaWV3IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge307XG5cblx0XHR0aGlzLnN0YXRlID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc3RhdGUuYXBwID0gYXBwU3RvcmUuZ2V0QWxsKCk7XG5cblx0XHR0aGlzLnRva2VuSXRlbVNldFN0b3JlID0gMDtcblx0XHR0aGlzLnRva2VuQXBwU3RvcmUgPSAwO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy50b2tlbkl0ZW1TZXRTdG9yZSA9IGl0ZW1TZXRTdG9yZS5hZGRMaXN0ZW5lcih0aGlzLl9vbkNoYW5nZS5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnRva2VuQXBwU3RvcmUgPSBhcHBTdG9yZS5hZGRMaXN0ZW5lcih0aGlzLl9vbkFwcENoYW5nZS5iaW5kKHRoaXMpKTtcblxuXHRcdC8vIFRPRE8gY291bGQgZG8gc29tZSBxdWljayBJRCB2YWxpZGF0aW9uXG5cdFx0Ly8gdG8gZGV0ZWN0IG9idmlvdXMgYmFkIElEcyBhbmQgbm90IGJvdGhlciBsb2FkaW5nLi5cblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmxvYWRfZGF0YSh0aGlzLnByb3BzLnBhcmFtcy5pZCkpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aXRlbVNldFN0b3JlLnJlbW92ZUxpc3RlbmVyKCcnLCB0aGlzLnRva2VuSXRlbVNldFN0b3JlKTtcblx0XHRhcHBTdG9yZS5yZW1vdmVMaXN0ZW5lcignJywgdGhpcy50b2tlbkFwcFN0b3JlKTtcblx0fVxuXG5cdF9vbkNoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoZGF0YSk7XG5cdH1cblx0XG5cdF9vbkFwcENoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gYXBwU3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGFwcDogZGF0YSB9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHQvLyBoYXZlIHRvIGNoZWNrIGlmIHJlc291cmNlIGV4aXN0cyBcblx0XHQvLyBpZiBub3QgcmVuZGVyIHNvbWV0aGluZyBkaWZmZXJlbnQgVE9ET1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblxuXHRcdFx0XHQ8U2hhcmUgaWQ9e3RoaXMuc3RhdGUuaWR9IHNob3c9e3RoaXMuc3RhdGUuYXBwLnNob3dTaGFyZX0gLz5cblx0XHRcdFx0PERvd25sb2FkIHNob3c9e3RoaXMuc3RhdGUuYXBwLnNob3dEb3dubG9hZH0gZGF0YT17dGhpcy5zdGF0ZS5pdGVtc2V0fSBpZD17dGhpcy5zdGF0ZS5pZH0gLz5cblx0XHRcdFx0PEluZm8gc2hvdz17dGhpcy5zdGF0ZS5hcHAuc2hvd0luZm99IC8+XG5cblxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTUgY29sLXNtLTUgY29sLW1kLTUnPlxuXHRcdFx0XHRcdDxWaWV3RGlzcGxheSBpdGVtc2V0PXt0aGlzLnN0YXRlLml0ZW1zZXR9IC8+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTUgY29sLXNtLTUgY29sLW1kLTUnPlxuXHRcdFx0XHRcdDxWaWV3QnVpbGQgYXBpVmVyc2lvbj17dGhpcy5wcm9wcy5hcGlWZXJzaW9ufSBkYXRhPXt0aGlzLnN0YXRlfSAvPlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXc7IiwiY2xhc3MgVmlld0J1aWxkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cblx0XHR9XG5cdH1cblxuXHRyZW5kZXJDaGFtcGlvbkltYWdlKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5kYXRhLmNoYW1waW9uLnJpb3RLZXkpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gKDxpbWcgc3JjPXsnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyB0aGlzLnByb3BzLmRhdGEuY2hhbXBpb24ucmlvdEtleSArICcucG5nJ30gLz4pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdHt0aGlzLnByb3BzLmRhdGEuaXRlbXNldC50aXRsZX1cblx0XHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJDaGFtcGlvbkltYWdlKCl9XG5cdFx0XHRcdFx0e3RoaXMucHJvcHMuZGF0YS5jaGFtcGlvbi5uYW1lfVxuXHRcdFx0XHRcdDxiciAvPlxuXHRcdFx0XHRcdDxiciAvPlxuXHRcdFx0XHRcdG1hcCBpbmZvXG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlld0J1aWxkOyIsImltcG9ydCBJdGVtQnV0dG9uIGZyb20gJy4uL2l0ZW1CdXR0b24nO1xuXG5jbGFzcyBWaWV3RGlzcGxheSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ3ZpZXctZGlzcGxheScsXG5cdFx0XHRibG9ja1RpdGxlOiAndmlldy1kaXNwbGF5LWJsb2NrLXRpdGxlIHhmb250JyxcblxuXHRcdH1cblx0fVxuXG5cdHJlbmRlckJsb2NrSXRlbXMoaXRlbXMpIHtcblx0XHRyZXR1cm4gaXRlbXMubWFwKChpdGVtLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtpdGVtLmlkICsgJy0nICsgaWR4fT5cblx0XHRcdFx0XHQ8SXRlbUJ1dHRvbiBpdGVtSWQ9e2l0ZW0uaWR9IC8+XG5cdFx0XHRcdFx0PHNwYW4+e2l0ZW0uY291bnR9PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXJCbG9ja3MoKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvcHMuaXRlbXNldC5ibG9ja3MubWFwKChibG9jaywgaWR4KSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGtleT17aWR4fT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmJsb2NrVGl0bGV9Pi0tIHtibG9jay50eXBlfTwvc3Bhbj5cblxuXHRcdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0XHR7dGhpcy5yZW5kZXJCbG9ja0l0ZW1zKGJsb2NrLml0ZW1zKX1cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J3JvdyAnICsgdGhpcy5zdHlsZXMud3JhcHBlcn0+XG5cdFx0XHRcdHt0aGlzLnJlbmRlckJsb2NrcygpfVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXdEaXNwbGF5OyJdfQ==
