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
		itemSetStore.addListener('id', this._onChange);
	},

	_onChange: function _onChange() {
		var data = itemSetStore.getAll();
		this.setState({ id: data.id });
	},

	mixins: [Router.State],

	/*
 	This is only for being on /create and click /create
 	or / and clicking /
 		we do a state reset to reset the editor
  */
	_onNavCreate: function _onNavCreate(e) {
		appDispatcher.dispatch(APP_ACTIONS.reset_all());
	},

	_onNavSave: function _onNavSave(e) {
		appDispatcher.dispatch(APP_ACTIONS.save_itemset());
		return false;
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

		if (this.isActive('create')) {
			createLinks[0].onClick = this._onNavCreate;
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
		this.tokenItemSet = 0;
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
			this.tokenItemSet = itemSetStore.addListener('id', this._onChange.bind(this));

			this.tokenAppStore = appStore.addListener(this._onAppChange.bind(this));
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			ItemStore.unnotify(this.tokenItemStore);
			itemSetStore.removeListener('champion', this.tokenChampion);
			itemSetStore.removeListener('id', this.tokenItemSet);
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
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'row' },
				React.createElement(_saveResult2['default'], { result: this.state.app.saveStatus }),
				React.createElement(_info2['default'], { show: this.state.app.showInfo }),
				React.createElement(_itemDisplayIndex2['default'], { items: this.state.items }),
				React.createElement(_itemSetIndex2['default'], { apiVersion: this.props.apiVersion, champion: this.state.champion, showDownload: this.state.app.showDownload, showShare: this.state.app.showShare, handleChampionSelect: this.onChampionSelect.bind(this) })
			);
		}
	}], [{
		key: 'willTransitionTo',
		value: function willTransitionTo(transition, context) {
			if (transition.path.indexOf('/edit/') === 0) {
				appDispatcher.dispatch(APP_ACTIONS.load_data(context.id));
			} else if (transition.path.indexOf('/create') === 0 || transition.path == '/') {
				appDispatcher.dispatch(APP_ACTIONS.reset_all());
			}
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
						{ className: 'col-xs-7 col-sm-7 col-md-7' },
						React.createElement(_itemCategories2['default'], { categories: this.state.categories, onCategoryCheck: this.changeCategories.bind(this) })
					),
					React.createElement(
						'div',
						{ className: 'col-xs-5 col-sm-5 col-md-5' },
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
						{ className: _this2.styles.parentCategoryTitle, onClick: _this2.handleCategory.bind(_this2, key) },
						key
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
			hide: 'hidden',
			imageChampion: 'item-champion-image',
			// wrapper, could be name or input box
			championName: 'item-champion-name-wrap xfont'
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
						_this.setState({ searchValue: '', showDropDown: false });
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
			var imageChampion = this.styles.imageChampion;

			var renderPickerOrChampion = React.createElement(
				'h2',
				null,
				this.props.champion.name
			);

			if (!this.props.champion.riotId) {
				imageUrl = 'http://ddragon.leagueoflegends.com/cdn/5.2.1/img/ui/champion.png';
				imageChampion = 'default-champion';
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
				React.createElement('img', { className: imageChampion, src: imageUrl }),
				React.createElement(
					'div',
					{ className: this.styles.championName },
					renderPickerOrChampion
				)
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
		this.tokenId = 0;

		this.dr = dragula({
			copy: false
		});
	}

	_createClass(ItemSetWidget, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.token = itemSetStore.addListener(this._onChange.bind(this));
			this.tokenSaveStatus = appStore.addListener('saveStatus', this._onSave.bind(this));

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
			appStore.removeListener('saveStatus', this.tokenSaveStatus);
		}
	}, {
		key: '_onSave',
		value: function _onSave() {
			var saveStatus = appStore.getAll().saveStatus;
			// check if the save was successful & if it was really a save event
			if (saveStatus && saveStatus.id && saveStatus.msg === 'ok') {
				this.context.router.transitionTo('edit', { id: saveStatus.id });
			}
		}
	}, {
		key: '_onChange',
		value: function _onChange() {
			var data = itemSetStore.getAll();
			this.setState(data);
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
		key: 'changeMap',
		value: function changeMap(mapkey) {
			appDispatcher.dispatch(APP_ACTIONS.select_map(mapkey));
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
				React.createElement('br', null),
				React.createElement(_mapSelect2['default'], { map: this.state.itemset.map, handleChange: this.changeMap.bind(this) }),
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

ItemSetWidget.contextTypes = {
	router: React.PropTypes.func
};

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
		this.maps = [{ key: 'any', name: 'All Maps' }, { key: 'SR', name: 'Summoner\'s Rift' }, { key: 'HA', name: 'Howling Abyss' }, { key: 'TT', name: 'Twisted Treeline' }, { key: 'CS', name: 'Crystal Scar' }];
	}

	_createClass(MapSelect, [{
		key: 'renderMapOptions',
		value: function renderMapOptions() {
			return this.maps.map(function (map) {
				return React.createElement(
					'option',
					{ key: map.key, value: map.key },
					map.name
				);
			});
		}
	}, {
		key: 'onChange',
		value: function onChange(event) {
			this.props.handleChange(event.target.value);
		}
	}, {
		key: 'render',
		value: function render() {
			return React.createElement(
				'div',
				{ className: 'row' },
				React.createElement(
					'label',
					null,
					'Map: '
				),
				React.createElement(
					'select',
					{ onChange: this.onChange.bind(this), value: this.props.map },
					this.renderMapOptions()
				)
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
				if (el) el.value = '';
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
			if (!this.props.result) {
				return null;
			}

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
					{ className: 'row' },
					React.createElement(
						'h2',
						{ className: 'xfont-thin' },
						this.state.itemset.title
					)
				),
				React.createElement('hr', null),
				React.createElement(
					'div',
					{ className: 'col-xs-5 col-sm-5 col-md-5' },
					React.createElement(_viewDisplay2['default'], { itemset: this.state.itemset })
				),
				React.createElement(
					'div',
					{ className: 'col-xs-5 col-sm-5 col-md-5 col-xs-offset-1 col-sm-offset-1 col-md-offset-1' },
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

		this.styles = {
			imageChampion: 'item-champion-image'
		};

		this.maps = [{ key: 'any', name: 'All Maps' }, { key: 'SR', name: 'Summoner\'s Rift' }, { key: 'HA', name: 'Howling Abyss' }, { key: 'TT', name: 'Twisted Treeline' }, { key: 'CS', name: 'Crystal Scar' }];
	}

	_createClass(ViewBuild, [{
		key: 'renderChampionImage',
		value: function renderChampionImage() {
			if (!this.props.data.champion.riotKey) {
				return null;
			}
			return React.createElement('img', { className: this.styles.imageChampion, src: 'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.data.champion.riotKey + '.png' });
		}
	}, {
		key: 'getMapName',
		value: function getMapName() {
			var _this = this;

			var r = undefined;
			this.maps.forEach(function (map) {
				if (map.key === _this.props.data.itemset.map) r = map.name;
			});
			return r;
		}
	}, {
		key: 'render',
		value: function render() {

			return React.createElement(
				'div',
				null,
				React.createElement(
					'div',
					{ className: 'row' },
					React.createElement(
						'div',
						{ className: '' },
						this.renderChampionImage()
					),
					React.createElement(
						'div',
						{ className: '' },
						React.createElement(
							'h3',
							{ className: 'xfont' },
							this.props.data.champion.name
						),
						React.createElement('br', null),
						this.props.data.champion.title
					)
				),
				React.createElement('br', null),
				React.createElement('br', null),
				this.getMapName()
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
			block: 'view-display-block',
			blockTitle: 'view-display-block-title xfont',
			itemButton: 'item-set-button-block',
			itemCount: 'item-set-button-block-count view-display-count'
		};
	}

	_createClass(ViewDisplay, [{
		key: 'renderBlockItems',
		value: function renderBlockItems(items) {
			var _this = this;

			return items.map(function (item, idx) {
				return React.createElement(
					'div',
					{ key: item.id + '-' + idx },
					React.createElement(
						'div',
						{ className: _this.styles.itemButton },
						React.createElement(_itemButton2['default'], { itemId: item.id }),
						React.createElement(
							'span',
							{ className: _this.styles.itemCount },
							item.count
						)
					)
				);
			});
		}
	}, {
		key: 'renderBlocks',
		value: function renderBlocks() {
			var _this2 = this;

			return this.props.itemset.blocks.map(function (block, idx) {
				return React.createElement(
					'div',
					{ key: idx, className: _this2.styles.block },
					React.createElement(
						'div',
						{ className: 'row ' + _this2.styles.blockTitle },
						React.createElement(
							'span',
							null,
							block.type
						)
					),
					React.createElement(
						'div',
						{ className: 'row' },
						_this2.renderBlockItems(block.items)
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
				React.createElement(
					'div',
					{ className: 'col-xs-12 col-sm-12 col-md-12' },
					this.renderBlocks()
				)
			);
		}
	}]);

	return ViewDisplay;
})(React.Component);

exports['default'] = ViewDisplay;
module.exports = exports['default'];

},{"../itemButton":27}]},{},[8])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXRvYS9hdG9hLmpzIiwibm9kZV9tb2R1bGVzL2NvbnRyYS9kZWJvdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvZW1pdHRlci5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvbm9kZV9tb2R1bGVzL3RpY2t5L3RpY2t5LWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L25vZGVfbW9kdWxlcy9jdXN0b20tZXZlbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9jcm9zc3ZlbnQuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9ldmVudG1hcC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9hcHAuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2NyZWF0ZS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbURpc3BsYXkvaW5kZXguanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1EaXNwbGF5L2l0ZW1DYXRlZ29yaWVzLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2NyZWF0ZS9pdGVtRGlzcGxheS9pdGVtRGlzcGxheS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbURpc3BsYXkvaXRlbVNlYXJjaC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9jaGFtcGlvblNlbGVjdC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9jcmVhdGVCbG9jay5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9pbmRleC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9pdGVtQmxvY2suanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1TZXQvaXRlbUJsb2Nrcy5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9tYXBTZWxlY3QuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1TZXQvdXBsb2FkLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2NyZWF0ZS9zYXZlUmVzdWx0LmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2Rvd25sb2FkLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2RyYWd1bGEvY2xhc3Nlcy5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9kcmFndWxhL2RyYWd1bGEuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvZHJhZ3VsYS9yZWFjdC1kcmFndWxhLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2luZm8uanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvaXRlbUJ1dHRvbi5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9zaGFyZS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy92aWV3L3ZpZXcuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvdmlldy92aWV3QnVpbGQuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvdmlldy92aWV3RGlzcGxheS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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SSxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxBQUFDO0tBQzdCOztRQUFLLFNBQVMsRUFBRSxNQUFLLE1BQU0sQ0FBQyxVQUFVLEFBQUM7TUFDdEMsK0NBQVksTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEFBQUMsR0FBRztNQUMvQjs7U0FBTSxTQUFTLEVBQUUsTUFBSyxNQUFNLENBQUMsU0FBUyxBQUFDO09BQUUsSUFBSSxDQUFDLEtBQUs7T0FBUTtNQUN0RDtLQUNELENBQ0w7SUFDRixDQUFDLENBQUM7R0FDSDs7O1NBRVcsd0JBQUc7OztBQUNkLFVBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFDLEtBQUssRUFBRSxHQUFHLEVBQUs7QUFDcEQsV0FDQzs7T0FBSyxHQUFHLEVBQUUsR0FBRyxBQUFDLEVBQUMsU0FBUyxFQUFFLE9BQUssTUFBTSxDQUFDLEtBQUssQUFBQztLQUMzQzs7UUFBSyxTQUFTLEVBQUUsTUFBTSxHQUFHLE9BQUssTUFBTSxDQUFDLFVBQVUsQUFBQztNQUFDOzs7T0FBTyxLQUFLLENBQUMsSUFBSTtPQUFRO01BQU07S0FFaEY7O1FBQUssU0FBUyxFQUFDLEtBQUs7TUFDbEIsT0FBSyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO01BQzlCO0tBQ0QsQ0FDTDtJQUNGLENBQUMsQ0FBQztHQUNIOzs7U0FFSyxrQkFBRztBQUNSLFVBQ0M7O01BQUssU0FBUyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQUFBQztJQUM1Qzs7T0FBSyxTQUFTLEVBQUMsK0JBQStCO0tBQzdDLElBQUksQ0FBQyxZQUFZLEVBQUU7S0FDZDtJQUNELENBQ0w7R0FDRjs7O1FBakRJLFdBQVc7R0FBUyxLQUFLLENBQUMsU0FBUzs7cUJBcUQxQixXQUFXIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXRvYSAoYSwgbikgeyByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYSwgbik7IH1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRpY2t5ID0gcmVxdWlyZSgndGlja3knKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWJvdW5jZSAoZm4sIGFyZ3MsIGN0eCkge1xuICBpZiAoIWZuKSB7IHJldHVybjsgfVxuICB0aWNreShmdW5jdGlvbiBydW4gKCkge1xuICAgIGZuLmFwcGx5KGN0eCB8fCBudWxsLCBhcmdzIHx8IFtdKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXRvYSA9IHJlcXVpcmUoJ2F0b2EnKTtcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbWl0dGVyICh0aGluZywgb3B0aW9ucykge1xuICB2YXIgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBldnQgPSB7fTtcbiAgaWYgKHRoaW5nID09PSB1bmRlZmluZWQpIHsgdGhpbmcgPSB7fTsgfVxuICB0aGluZy5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIGlmICghZXZ0W3R5cGVdKSB7XG4gICAgICBldnRbdHlwZV0gPSBbZm5dO1xuICAgIH0gZWxzZSB7XG4gICAgICBldnRbdHlwZV0ucHVzaChmbik7XG4gICAgfVxuICAgIHJldHVybiB0aGluZztcbiAgfTtcbiAgdGhpbmcub25jZSA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIGZuLl9vbmNlID0gdHJ1ZTsgLy8gdGhpbmcub2ZmKGZuKSBzdGlsbCB3b3JrcyFcbiAgICB0aGluZy5vbih0eXBlLCBmbik7XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKGMgPT09IDEpIHtcbiAgICAgIGRlbGV0ZSBldnRbdHlwZV07XG4gICAgfSBlbHNlIGlmIChjID09PSAwKSB7XG4gICAgICBldnQgPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGV0ID0gZXZ0W3R5cGVdO1xuICAgICAgaWYgKCFldCkgeyByZXR1cm4gdGhpbmc7IH1cbiAgICAgIGV0LnNwbGljZShldC5pbmRleE9mKGZuKSwgMSk7XG4gICAgfVxuICAgIHJldHVybiB0aGluZztcbiAgfTtcbiAgdGhpbmcuZW1pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IGF0b2EoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpbmcuZW1pdHRlclNuYXBzaG90KGFyZ3Muc2hpZnQoKSkuYXBwbHkodGhpcywgYXJncyk7XG4gIH07XG4gIHRoaW5nLmVtaXR0ZXJTbmFwc2hvdCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdmFyIGV0ID0gKGV2dFt0eXBlXSB8fCBbXSkuc2xpY2UoMCk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBhcmdzID0gYXRvYShhcmd1bWVudHMpO1xuICAgICAgdmFyIGN0eCA9IHRoaXMgfHwgdGhpbmc7XG4gICAgICBpZiAodHlwZSA9PT0gJ2Vycm9yJyAmJiBvcHRzLnRocm93cyAhPT0gZmFsc2UgJiYgIWV0Lmxlbmd0aCkgeyB0aHJvdyBhcmdzLmxlbmd0aCA9PT0gMSA/IGFyZ3NbMF0gOiBhcmdzOyB9XG4gICAgICBldC5mb3JFYWNoKGZ1bmN0aW9uIGVtaXR0ZXIgKGxpc3Rlbikge1xuICAgICAgICBpZiAob3B0cy5hc3luYykgeyBkZWJvdW5jZShsaXN0ZW4sIGFyZ3MsIGN0eCk7IH0gZWxzZSB7IGxpc3Rlbi5hcHBseShjdHgsIGFyZ3MpOyB9XG4gICAgICAgIGlmIChsaXN0ZW4uX29uY2UpIHsgdGhpbmcub2ZmKHR5cGUsIGxpc3Rlbik7IH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaW5nO1xuICAgIH07XG4gIH07XG4gIHJldHVybiB0aGluZztcbn07XG4iLCJ2YXIgc2kgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nLCB0aWNrO1xuaWYgKHNpKSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0SW1tZWRpYXRlKGZuKTsgfTtcbn0gZWxzZSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0VGltZW91dChmbiwgMCk7IH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGljazsiLCJcbnZhciBOYXRpdmVDdXN0b21FdmVudCA9IGdsb2JhbC5DdXN0b21FdmVudDtcblxuZnVuY3Rpb24gdXNlTmF0aXZlICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgcCA9IG5ldyBOYXRpdmVDdXN0b21FdmVudCgnY2F0JywgeyBkZXRhaWw6IHsgZm9vOiAnYmFyJyB9IH0pO1xuICAgIHJldHVybiAgJ2NhdCcgPT09IHAudHlwZSAmJiAnYmFyJyA9PT0gcC5kZXRhaWwuZm9vO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENyb3NzLWJyb3dzZXIgYEN1c3RvbUV2ZW50YCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQuQ3VzdG9tRXZlbnRcbiAqXG4gKiBAcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB1c2VOYXRpdmUoKSA/IE5hdGl2ZUN1c3RvbUV2ZW50IDpcblxuLy8gSUUgPj0gOVxuJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50ID8gZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICBpZiAocGFyYW1zKSB7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgfSBlbHNlIHtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UsIHZvaWQgMCk7XG4gIH1cbiAgcmV0dXJuIGU7XG59IDpcblxuLy8gSUUgPD0gOFxuZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gIGUudHlwZSA9IHR5cGU7XG4gIGlmIChwYXJhbXMpIHtcbiAgICBlLmJ1YmJsZXMgPSBCb29sZWFuKHBhcmFtcy5idWJibGVzKTtcbiAgICBlLmNhbmNlbGFibGUgPSBCb29sZWFuKHBhcmFtcy5jYW5jZWxhYmxlKTtcbiAgICBlLmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gIH0gZWxzZSB7XG4gICAgZS5idWJibGVzID0gZmFsc2U7XG4gICAgZS5jYW5jZWxhYmxlID0gZmFsc2U7XG4gICAgZS5kZXRhaWwgPSB2b2lkIDA7XG4gIH1cbiAgcmV0dXJuIGU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjdXN0b21FdmVudCA9IHJlcXVpcmUoJ2N1c3RvbS1ldmVudCcpO1xudmFyIGV2ZW50bWFwID0gcmVxdWlyZSgnLi9ldmVudG1hcCcpO1xudmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbnZhciBhZGRFdmVudCA9IGFkZEV2ZW50RWFzeTtcbnZhciByZW1vdmVFdmVudCA9IHJlbW92ZUV2ZW50RWFzeTtcbnZhciBoYXJkQ2FjaGUgPSBbXTtcblxuaWYgKCFnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICBhZGRFdmVudCA9IGFkZEV2ZW50SGFyZDtcbiAgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEhhcmQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhZGQ6IGFkZEV2ZW50LFxuICByZW1vdmU6IHJlbW92ZUV2ZW50LFxuICBmYWJyaWNhdGU6IGZhYnJpY2F0ZUV2ZW50XG59O1xuXG5mdW5jdGlvbiBhZGRFdmVudEVhc3kgKGVsLCB0eXBlLCBmbiwgY2FwdHVyaW5nKSB7XG4gIHJldHVybiBlbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZuLCBjYXB0dXJpbmcpO1xufVxuXG5mdW5jdGlvbiBhZGRFdmVudEhhcmQgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZWwuYXR0YWNoRXZlbnQoJ29uJyArIHR5cGUsIHdyYXAoZWwsIHR5cGUsIGZuKSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBsaXN0ZW5lciA9IHVud3JhcChlbCwgdHlwZSwgZm4pO1xuICBpZiAobGlzdGVuZXIpIHtcbiAgICByZXR1cm4gZWwuZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmYWJyaWNhdGVFdmVudCAoZWwsIHR5cGUsIG1vZGVsKSB7XG4gIHZhciBlID0gZXZlbnRtYXAuaW5kZXhPZih0eXBlKSA9PT0gLTEgPyBtYWtlQ3VzdG9tRXZlbnQoKSA6IG1ha2VDbGFzc2ljRXZlbnQoKTtcbiAgaWYgKGVsLmRpc3BhdGNoRXZlbnQpIHtcbiAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICB9IGVsc2Uge1xuICAgIGVsLmZpcmVFdmVudCgnb24nICsgdHlwZSwgZSk7XG4gIH1cbiAgZnVuY3Rpb24gbWFrZUNsYXNzaWNFdmVudCAoKSB7XG4gICAgdmFyIGU7XG4gICAgaWYgKGRvYy5jcmVhdGVFdmVudCkge1xuICAgICAgZSA9IGRvYy5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgIGUuaW5pdEV2ZW50KHR5cGUsIHRydWUsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoZG9jLmNyZWF0ZUV2ZW50T2JqZWN0KSB7XG4gICAgICBlID0gZG9jLmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBlO1xuICB9XG4gIGZ1bmN0aW9uIG1ha2VDdXN0b21FdmVudCAoKSB7XG4gICAgcmV0dXJuIG5ldyBjdXN0b21FdmVudCh0eXBlLCB7IGRldGFpbDogbW9kZWwgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JhcHBlckZhY3RvcnkgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlciAob3JpZ2luYWxFdmVudCkge1xuICAgIHZhciBlID0gb3JpZ2luYWxFdmVudCB8fCBnbG9iYWwuZXZlbnQ7XG4gICAgZS50YXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCA9IGUucHJldmVudERlZmF1bHQgfHwgZnVuY3Rpb24gcHJldmVudERlZmF1bHQgKCkgeyBlLnJldHVyblZhbHVlID0gZmFsc2U7IH07XG4gICAgZS5zdG9wUHJvcGFnYXRpb24gPSBlLnN0b3BQcm9wYWdhdGlvbiB8fCBmdW5jdGlvbiBzdG9wUHJvcGFnYXRpb24gKCkgeyBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7IH07XG4gICAgZS53aGljaCA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIGZuLmNhbGwoZWwsIGUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB3cmFwIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIHdyYXBwZXIgPSB1bndyYXAoZWwsIHR5cGUsIGZuKSB8fCB3cmFwcGVyRmFjdG9yeShlbCwgdHlwZSwgZm4pO1xuICBoYXJkQ2FjaGUucHVzaCh7XG4gICAgd3JhcHBlcjogd3JhcHBlcixcbiAgICBlbGVtZW50OiBlbCxcbiAgICB0eXBlOiB0eXBlLFxuICAgIGZuOiBmblxuICB9KTtcbiAgcmV0dXJuIHdyYXBwZXI7XG59XG5cbmZ1bmN0aW9uIHVud3JhcCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBpID0gZmluZChlbCwgdHlwZSwgZm4pO1xuICBpZiAoaSkge1xuICAgIHZhciB3cmFwcGVyID0gaGFyZENhY2hlW2ldLndyYXBwZXI7XG4gICAgaGFyZENhY2hlLnNwbGljZShpLCAxKTsgLy8gZnJlZSB1cCBhIHRhZCBvZiBtZW1vcnlcbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGksIGl0ZW07XG4gIGZvciAoaSA9IDA7IGkgPCBoYXJkQ2FjaGUubGVuZ3RoOyBpKyspIHtcbiAgICBpdGVtID0gaGFyZENhY2hlW2ldO1xuICAgIGlmIChpdGVtLmVsZW1lbnQgPT09IGVsICYmIGl0ZW0udHlwZSA9PT0gdHlwZSAmJiBpdGVtLmZuID09PSBmbikge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBldmVudG1hcCA9IFtdO1xudmFyIGV2ZW50bmFtZSA9ICcnO1xudmFyIHJvbiA9IC9eb24vO1xuXG5mb3IgKGV2ZW50bmFtZSBpbiBnbG9iYWwpIHtcbiAgaWYgKHJvbi50ZXN0KGV2ZW50bmFtZSkpIHtcbiAgICBldmVudG1hcC5wdXNoKGV2ZW50bmFtZS5zbGljZSgyKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBldmVudG1hcDtcbiIsInZhciBSb3V0ZXIgPSB3aW5kb3cuUmVhY3RSb3V0ZXI7XG52YXIgRGVmYXVsdFJvdXRlID0gUm91dGVyLkRlZmF1bHRSb3V0ZTtcbnZhciBSb3V0ZSA9IFJvdXRlci5Sb3V0ZTtcbnZhciBSb3V0ZUhhbmRsZXIgPSBSb3V0ZXIuUm91dGVIYW5kbGVyO1xudmFyIExpbmsgPSBSb3V0ZXIuTGluaztcblxuaW1wb3J0IENyZWF0ZSBmcm9tICcuL2NyZWF0ZS9jcmVhdGUnO1xuaW1wb3J0IFZpZXcgZnJvbSAnLi92aWV3L3ZpZXcnO1xuXG52YXIgQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXG5cdHN0eWxlczoge1xuXHRcdGRpc2FibGVOYXY6ICdkaXNhYmxlJ1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgaW5pdElEID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVZlcnNpb246ICc1LjE2LjEnLFxuXHRcdFx0aWQ6IGluaXRJRC5pZCxcblx0XHR9O1xuXHR9LFxuXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHQvLyBnZXRzIGFsZXJ0ZWQgb24gZXZlcnkgc2F2ZSBhdHRlbXB0LCBldmVuIGZvciBmYWlsIHNhdmVzXG5cdFx0aXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKCdpZCcsIHRoaXMuX29uQ2hhbmdlKTtcblx0fSxcblxuXHRfb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGlkOiBkYXRhLmlkIH0pO1xuXHR9LFxuXG5cdG1peGluczogW1JvdXRlci5TdGF0ZV0sXG5cblx0Lypcblx0XHRUaGlzIGlzIG9ubHkgZm9yIGJlaW5nIG9uIC9jcmVhdGUgYW5kIGNsaWNrIC9jcmVhdGVcblx0XHRvciAvIGFuZCBjbGlja2luZyAvXG5cblx0XHR3ZSBkbyBhIHN0YXRlIHJlc2V0IHRvIHJlc2V0IHRoZSBlZGl0b3Jcblx0ICovXG5cdF9vbk5hdkNyZWF0ZTogZnVuY3Rpb24oZSkge1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMucmVzZXRfYWxsKCkpO1xuXHR9LFxuXG5cdF9vbk5hdlNhdmU6IGZ1bmN0aW9uKGUpIHtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnNhdmVfaXRlbXNldCgpKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0X29uTmF2RG93bmxvYWQ6IGZ1bmN0aW9uKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuc2hvd19kb3dubG9hZCgpKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0X29uTmF2U2hhcmU6IGZ1bmN0aW9uKGUpIHtcblx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuc2hvd19zaGFyZSgpKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0X29uTmF2SW5mbzogZnVuY3Rpb24oZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5zaG93X2luZm8oKSk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cblx0cmVuZGVyTGlua3M6IGZ1bmN0aW9uKGxpbmssIGdseXBoLCBuYW1lKSB7XHRcdFx0XG5cdFx0Lypcblx0XHRcdFRoZSBtb2RlIHdlIGFyZSBpbiBkZXBlbmRzIG9uIGlmIHdlIGhhdmUgZG9jdW1lbnQgSUQgZm9yIGFuIGl0ZW1zZXRcblx0XHRcdERpZmZlcmVudCBsaW5rcyBmb3IgZGlmZmVyZW50IG1vZGVzXG5cdFx0XHRUaGVyZSBpcyBhIHZpZXcgbW9kZVxuXHRcdFx0QW5kIGEgY3JlYXRlIG1vZGVcblx0XHQgKi9cblx0XHRjb25zdCBpZCA9IHRoaXMuc3RhdGUuaWQ7XG5cblx0XHRjb25zdCB2aWV3TGlua3MgPSBbXG5cdFx0XHR7IHVybDogJ2NyZWF0ZScsIGdseXBoOiAnZ2x5cGhpY29uLWZpbGUnLCB0ZXh0OiAnTmV3JyB9LFxuXHRcdFx0eyB1cmw6ICdlZGl0JywgcGFyYW1zOiBpZCwgZ2x5cGg6ICdnbHlwaGljb24tcGVuY2lsJywgdGV4dDogJ0VkaXQnIH0sXHRcdFx0XG5cdFx0XHR7IHVybDogJ3ZpZXcnLCBwYXJhbXM6IGlkLCBvbkNsaWNrOiB0aGlzLl9vbk5hdkRvd25sb2FkLCBnbHlwaDogJ2dseXBoaWNvbi1zYXZlJywgdGV4dDogJ0Rvd25sb2FkJyB9LFxuXHRcdFx0eyB1cmw6ICd2aWV3JywgcGFyYW1zOiBpZCwgb25DbGljazogdGhpcy5fb25OYXZTaGFyZSwgZ2x5cGg6ICdnbHlwaGljb24tc2hhcmUnLCB0ZXh0OiAnU2hhcmUnIH0sXG5cdFx0XHR7IHVybDogJ3ZpZXcnLCBwYXJhbXM6IGlkLCBvbkNsaWNrOiB0aGlzLl9vbk5hdkluZm8sIGdseXBoOiAnZ2x5cGhpY29uLWVxdWFsaXplcicsIHRleHQ6ICdBYm91dCcgfSxcblx0XHRdO1xuXHRcdGxldCBjcmVhdGVMaW5rcyA9IFtcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgZ2x5cGg6ICdnbHlwaGljb24tZmlsZScsIHRleHQ6ICdOZXcnIH0sXG5cdFx0XHR7IHVybDogJ2NyZWF0ZScsIG9uQ2xpY2s6IHRoaXMuX29uTmF2U2F2ZSwgZ2x5cGg6ICdnbHlwaGljb24tb2snLCB0ZXh0OiAnU2F2ZScgfSxcblx0XHRcdC8vIHRoZSByZXN0IG9mIHRoZXNlIGxpbmtzIG9ubHkgYXZhaWxhYmxlIGlmIHNhdmVkXG5cdFx0XHR7IHVybDogJ3ZpZXcnLCBwYXJhbXM6IGlkLCBnbHlwaDogJ2dseXBoaWNvbi11bmNoZWNrZWQnLCB0ZXh0OiAnVmlldycsIG5lZWRJRDogdHJ1ZSB9LFxuXHRcdFx0eyB1cmw6ICdjcmVhdGUnLCBvbkNsaWNrOiB0aGlzLl9vbk5hdkRvd25sb2FkLCBnbHlwaDogJ2dseXBoaWNvbi1zYXZlJywgdGV4dDogJ0Rvd25sb2FkJywgbmVlZElEOiB0cnVlIH0sXG5cdFx0XHR7IHVybDogJ2NyZWF0ZScsIG9uQ2xpY2s6IHRoaXMuX29uTmF2U2hhcmUsIGdseXBoOiAnZ2x5cGhpY29uLXNoYXJlJywgdGV4dDogJ1NoYXJlJywgbmVlZElEOiB0cnVlIH0sXG5cdFx0XHR7IHVybDogJ2NyZWF0ZScsIG9uQ2xpY2s6IHRoaXMuX29uTmF2SW5mbywgZ2x5cGg6ICdnbHlwaGljb24tZXF1YWxpemVyJywgdGV4dDogJ0Fib3V0JyB9LFxuXHRcdF07XG5cblx0XHRsZXQgbW9kZSA9IGNyZWF0ZUxpbmtzO1xuXHRcdGlmICh0aGlzLmlzQWN0aXZlKCd2aWV3JykpIHtcblx0XHRcdG1vZGUgPSB2aWV3TGlua3M7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuaXNBY3RpdmUoJ2NyZWF0ZScpKSB7XG5cdFx0XHRjcmVhdGVMaW5rc1swXS5vbkNsaWNrID0gdGhpcy5fb25OYXZDcmVhdGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1vZGUubWFwKGxpbmsgPT4ge1xuXHRcdFx0Y29uc3QgaW5uZXIgPSAoXG5cdFx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nc2lkZWJhci1pY29uJz5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT17J2dseXBoaWNvbiAnICsgbGluay5nbHlwaH0+PC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxzcGFuPntsaW5rLnRleHR9PC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblxuXHRcdFx0bGV0IHI7XG5cblx0XHRcdC8vIGRpc2FibGUgY2VydGFpbiBtZW51IG9wdGlvbnMgd2hlbiB3ZSBkb24ndFxuXHRcdFx0Ly8gaGF2ZSBhbiBJRFxuXHRcdFx0aWYgKGxpbmsubmVlZElEICYmICF0aGlzLnN0YXRlLmlkKSB7XG5cdFx0XHRcdFx0ciA9IChcblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5kaXNhYmxlTmF2fT5cblx0XHRcdFx0XHRcdHtpbm5lcn1cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAobGlua1snb25DbGljayddKSB7XG5cdFx0XHRcdFx0ciA9ICg8TGluayB0bz17bGluay51cmx9IHBhcmFtcz17e2lkOiBsaW5rLnBhcmFtc319IG9uQ2xpY2s9e2xpbmtbJ29uQ2xpY2snXX0+e2lubmVyfTwvTGluaz4pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ciA9ICg8TGluayB0bz17bGluay51cmx9IHBhcmFtcz17e2lkOiBsaW5rLnBhcmFtc319Pntpbm5lcn08L0xpbms+KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGtleT17bGluay50ZXh0ICsgKGxpbmsucGFyYW1zIHx8ICcnKX0gY2xhc3NOYW1lPSdzaWRlYmFyLWxpbmsnPlxuXHRcdFx0XHRcdHtyfVxuXHRcdFx0XHQ8L2Rpdj5cdFx0XHRcblx0XHRcdCk7XG5cdFx0fSk7XG5cdH0sXG5cdFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAoXG5cdFx0PGRpdj5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtMiBjb2wtbWQtMiBzaWRlYmFyJz5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J3NpZGViYXItbG9nbyc+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdzaWRlYmFyLWxpbmstdGV4dCB4Zm9udC10aGluJz5JdGVtIEJ1aWxkZXI8L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XG5cdFx0XHRcdHt0aGlzLnJlbmRlckxpbmtzKCl9XG5cdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy05IGNvbC1tZC05IGNvbC14cy1vZmZzZXQtMSBjb2wtbWQtb2Zmc2V0LTEgY29udGVudCc+XG5cdFx0XHRcdDxSb3V0ZUhhbmRsZXIgYXBpVmVyc2lvbj17dGhpcy5zdGF0ZS5hcGlWZXJzaW9ufSAvPlxuXHRcdFx0PC9kaXY+XG5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn0pO1xuXG5cbnZhciByb3V0ZXMgPSAoXG5cdDxSb3V0ZSBuYW1lPSdhcHAnIHBhdGg9Jy8nIGhhbmRsZXI9e0FwcH0+XG5cdFx0PFJvdXRlIG5hbWU9J2NyZWF0ZScgaGFuZGxlcj17Q3JlYXRlfSAvPlxuXHRcdDxSb3V0ZSBuYW1lPSd2aWV3JyBwYXRoPVwidmlldy86aWRcIiBoYW5kbGVyPXtWaWV3fSAvPlxuXHRcdDxSb3V0ZSBuYW1lPSdlZGl0JyBwYXRoPVwiZWRpdC86aWRcIiBoYW5kbGVyPXtDcmVhdGV9IC8+XG5cdFx0PERlZmF1bHRSb3V0ZSBoYW5kbGVyPXtDcmVhdGV9IC8+XG5cdDwvUm91dGU+XG4pO1xuXG5Sb3V0ZXIucnVuKHJvdXRlcywgUm91dGVyLkhpc3RvcnlMb2NhdGlvbiwgZnVuY3Rpb24oSGFuZGxlcikge1xuXHRSZWFjdC5yZW5kZXIoPEhhbmRsZXIgLz4sIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKSk7XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgQXBwOyIsImltcG9ydCBJdGVtRGlzcGxheVdpZGdldCBmcm9tICcuL2l0ZW1EaXNwbGF5L2luZGV4JztcbmltcG9ydCBJdGVtU2V0V2lkZ2V0IGZyb20gJy4vaXRlbVNldC9pbmRleCc7XG5pbXBvcnQgU2F2ZVJlc3VsdCBmcm9tICcuL3NhdmVSZXN1bHQnO1xuaW1wb3J0IEluZm8gZnJvbSAnLi4vaW5mbyc7XG5cbmNsYXNzIENyZWF0ZSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0Lypcblx0XHRcdGNoYW1wU2VsZWN0V3JhcDogJ2l0ZW0tY2hhbXAtc2VsZWN0LXdyYXAnLFxuXHRcdFx0Y2hhbXBTZWxlY3Q6ICdpdGVtLWNoYW1wLXNlbGVjdCcsXG5cdFx0XHRjaGFtcGlvblNlbGVjdEJsb2NrOiAnaXRlbS1jaGFtcC1zZWxlY3QtYmxvY2snXG5cdFx0XHQqL1xuXHRcdH07XG5cblx0XHR0aGlzLnN0YXRlID0gaXRlbVNldFN0b3JlLmdldEFsbCgpXG5cdFx0dGhpcy5zdGF0ZS5hcHAgPSBhcHBTdG9yZS5nZXRBbGwoKTtcblxuXHRcdHRoaXMudG9rZW5DaGFtcGlvbiA9IDA7XG5cdFx0dGhpcy50b2tlbkl0ZW1TZXQgPSAwO1xuXHRcdHRoaXMudG9rZW5JdGVtU3RvcmUgPSAwO1xuXHRcdHRoaXMudG9rZW5BcHBTdG9yZSA9IDA7XG5cdH1cblxuXHRzdGF0aWMgd2lsbFRyYW5zaXRpb25Ubyh0cmFuc2l0aW9uLCBjb250ZXh0KSB7XG5cdFx0aWYgKHRyYW5zaXRpb24ucGF0aC5pbmRleE9mKCcvZWRpdC8nKSA9PT0gMCkge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5sb2FkX2RhdGEoY29udGV4dC5pZCkpO1xuXHRcdH0gZWxzZSBpZiAodHJhbnNpdGlvbi5wYXRoLmluZGV4T2YoJy9jcmVhdGUnKSA9PT0gMCB8fCB0cmFuc2l0aW9uLnBhdGggPT0gJy8nKSB7XG5cdFx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnJlc2V0X2FsbCgpKTtcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblxuXHRcdHRoaXMudG9rZW5JdGVtU3RvcmUgPSBJdGVtU3RvcmUubm90aWZ5KGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhhdC5zZXRTdGF0ZSh7IGl0ZW1zOiBJdGVtU3RvcmUuaXRlbXMgfSk7XG5cdFx0fSk7XG5cblxuXHRcdHRoaXMudG9rZW5DaGFtcGlvbiA9IGl0ZW1TZXRTdG9yZS5hZGRMaXN0ZW5lcignY2hhbXBpb24nLCB0aGlzLl9vbkNoYW5nZS5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnRva2VuSXRlbVNldCA9IGl0ZW1TZXRTdG9yZS5hZGRMaXN0ZW5lcignaWQnLCB0aGlzLl9vbkNoYW5nZS5iaW5kKHRoaXMpKTtcblxuXG5cdFx0dGhpcy50b2tlbkFwcFN0b3JlID0gYXBwU3RvcmUuYWRkTGlzdGVuZXIodGhpcy5fb25BcHBDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRJdGVtU3RvcmUudW5ub3RpZnkodGhpcy50b2tlbkl0ZW1TdG9yZSk7XG5cdFx0aXRlbVNldFN0b3JlLnJlbW92ZUxpc3RlbmVyKCdjaGFtcGlvbicsIHRoaXMudG9rZW5DaGFtcGlvbik7XG5cdFx0aXRlbVNldFN0b3JlLnJlbW92ZUxpc3RlbmVyKCdpZCcsIHRoaXMudG9rZW5JdGVtU2V0KTtcblx0XHRhcHBTdG9yZS5yZW1vdmVMaXN0ZW5lcignJywgdGhpcy50b2tlbkFwcFN0b3JlKTtcblx0fVxuXG5cdF9vbkNoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBjaGFtcGlvbjogZGF0YS5jaGFtcGlvbiwgc2F2ZVN0YXR1czogZGF0YS5zYXZlU3RhdHVzIH0pO1xuXHR9XG5cblx0X29uQXBwQ2hhbmdlKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBhcHBTdG9yZS5nZXRBbGwoKTtcblx0XHR0aGlzLnNldFN0YXRlKHsgYXBwOiBkYXRhIH0pO1x0XHRcblx0fVxuXG5cdG9uQ2hhbXBpb25TZWxlY3QoY2hhbXBpb25PYmopIHtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmNoYW1waW9uX3VwZGF0ZShjaGFtcGlvbk9iaikpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXHRcdFx0XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0PFNhdmVSZXN1bHQgcmVzdWx0PXt0aGlzLnN0YXRlLmFwcC5zYXZlU3RhdHVzfSAvPlxuXHRcdFx0XHQ8SW5mbyBzaG93PXt0aGlzLnN0YXRlLmFwcC5zaG93SW5mb30gLz5cblxuXHRcdFx0XHQ8SXRlbURpc3BsYXlXaWRnZXQgaXRlbXM9e3RoaXMuc3RhdGUuaXRlbXN9IC8+XG5cdFx0XHRcdDxJdGVtU2V0V2lkZ2V0IGFwaVZlcnNpb249e3RoaXMucHJvcHMuYXBpVmVyc2lvbn0gIGNoYW1waW9uPXt0aGlzLnN0YXRlLmNoYW1waW9ufSBzaG93RG93bmxvYWQ9e3RoaXMuc3RhdGUuYXBwLnNob3dEb3dubG9hZH0gc2hvd1NoYXJlPXt0aGlzLnN0YXRlLmFwcC5zaG93U2hhcmV9IGhhbmRsZUNoYW1waW9uU2VsZWN0PXt0aGlzLm9uQ2hhbXBpb25TZWxlY3QuYmluZCh0aGlzKX0gLz5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBDcmVhdGU7XG4iLCJpbXBvcnQgSXRlbUNhdGVnb3JpZXMgZnJvbSAnLi9pdGVtQ2F0ZWdvcmllcyc7XG5pbXBvcnQgSXRlbURpc3BsYXkgZnJvbSAnLi9pdGVtRGlzcGxheSc7XG5pbXBvcnQgSXRlbVNlYXJjaCBmcm9tICcuL2l0ZW1TZWFyY2gnO1xuXG5jb25zdCBnZXRCYXNlQ2F0ZWdvcmllcyA9IGZ1bmN0aW9uKCkge1xuXHRjb25zdCBiYXNlQ2F0ZWdvcmllcyA9IHtcblx0XHRcdFx0J0FsbCBJdGVtcyc6IFtdLFxuXHRcdFx0XHQnU3RhcnRpbmcgSXRlbXMnOiBbXG5cdFx0XHRcdFx0eyBuYW1lOiAnSnVuZ2xlJywgdGFnczogWydKdW5nbGUnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnTGFuZScsIHRhZ3M6IFsnTGFuZSddLCBjaGVja2VkOiBmYWxzZSB9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdCdUb29scyc6IFtcblx0XHRcdFx0XHR7IG5hbWU6ICdDb25zdW1hYmxlJywgdGFnczogWydDb25zdW1hYmxlJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0dvbGQgSW5jb21lJywgdGFnczogWydHb2xkUGVyJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ1Zpc2lvbiAmIFRyaW5rZXRzJywgdGFnczogWydWaXNpb24nLCAnVHJpbmtldCddLCBjaGVja2VkOiBmYWxzZSB9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdCdEZWZlbnNlJzogW1xuXHRcdFx0XHRcdHsgbmFtZTogJ0FybW9yJywgdGFnczogWydBcm1vciddLCBjaGVja2VkOiBmYWxzZSB9LFxuXHRcdFx0XHRcdHsgbmFtZTogJ0hlYWx0aCcsIHRhZ3M6IFsnSGVhbHRoJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0hlYWx0aCBSZWdlbicsIHRhZ3M6IFsnSGVhbHRoUmVnZW4nXSwgY2hlY2tlZDogZmFsc2UgfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHQnQXR0YWNrJzogW1xuXHRcdFx0XHRcdHsgbmFtZTogJ0F0dGFjayBTcGVlZCcsIHRhZ3M6IFsnQXR0YWNrU3BlZWQnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnQ3JpdGljYWwgU3RyaWtlJywgdGFnczogWydDcml0aWNhbFN0cmlrZSddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdEYW1hZ2UnLCB0YWdzOiBbJ0RhbWFnZSddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdMaWZlIFN0ZWFsJywgdGFnczogWydMaWZlU3RlYWwnLCAnU3BlbGxWYW1wJ10sIGNoZWNrZWQ6IGZhbHNlIH1cblx0XHRcdFx0XSxcblx0XHRcdFx0J01hZ2ljJzogW1xuXHRcdFx0XHRcdHsgbmFtZTogJ0Nvb2xkb3duIFJlZHVjdGlvbicsIHRhZ3M6IFsnQ29vbGRvd25SZWR1Y3Rpb24nXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnTWFuYScsIHRhZ3M6IFsnTWFuYSddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdNYW5hIFJlZ2VuJywgdGFnczogWydNYW5hUmVnZW4nXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnQWJpbGl0eSBQb3dlcicsIHRhZ3M6IFsnU3BlbGxEYW1hZ2UnXSwgY2hlY2tlZDogZmFsc2UgfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHQnTW92ZW1lbnQnOiBbXG5cdFx0XHRcdFx0eyBuYW1lOiAnQm9vdHMnLCB0YWdzOiBbJ0Jvb3RzJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ090aGVyIE1vdmVtZW50JywgdGFnczogWydOb25ib290c01vdmVtZW50J10sIGNoZWNrZWQ6IGZhbHNlIH1cblx0XHRcdFx0XVxuXHR9O1xuXHRyZXR1cm4gYmFzZUNhdGVnb3JpZXM7XG59XG5cbmNsYXNzIEl0ZW1EaXNwbGF5V2lkZ2V0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0aXRlbURpc3BsYXlXcmFwcGVyOiAnIGl0ZW0tZGlzcGxheS1ib3gtd3JhcCcsXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7IGNhdGVnb3JpZXM6IGdldEJhc2VDYXRlZ29yaWVzKCksIHNlYXJjaDogJyd9O1xuXHR9XG5cblx0Y2hhbmdlQ2F0ZWdvcmllcyhjYXRlZ29yeU5hbWUsIHN1YkNhdGVnb3J5KSB7XG5cdFx0bGV0IGNhdHMgPSBbXTtcblx0XHRsZXQgY2F0ZWdvcmllcyA9IHRoaXMuc3RhdGUuY2F0ZWdvcmllcztcblxuXHRcdGlmICh0eXBlb2Ygc3ViQ2F0ZWdvcnkgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHQvLyByZXNldCBhbGwgY2hlY2tzIHdoZW4gYSBwYXJlbnQgY2F0ZWdvcnkgaXMgY2xpY2tlZFxuXHRcdFx0Ly8gXG5cdFx0XHQvLyBUT0RPISB0aGlzIG1ha2VzIGl0IHNldCBhIGJ1bmNoIG9mIEFORCB0YWdzIHRvIGZpbHRlclxuXHRcdFx0Ly8gd2Ugd2FudCBPUiwgd2UgbWlnaHQgbm90IGV2ZW4gd2FudCB0aGlzIGNvZGUgaGVyZS4uLlxuXHRcdFx0Y2F0ZWdvcmllcyA9IGdldEJhc2VDYXRlZ29yaWVzKCk7XG5cdFx0XHRjYXRzID0gQXJyYXkuYXBwbHkoMCwgQXJyYXkoY2F0ZWdvcmllc1tjYXRlZ29yeU5hbWVdLmxlbmd0aCkpLm1hcCgoeCwgeSkgPT4geSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhdHMucHVzaChzdWJDYXRlZ29yeSk7XG5cdFx0fVxuXG5cdFx0Ly8gaGFja3kgYW5kIHRvbyBzdHJpY3QgYW5kIGxpdGVyYWwsIGJ1dCB3aGF0ZXZlclxuXHRcdGlmIChjYXRlZ29yeU5hbWUgIT09ICdBbGwgSXRlbXMnKSB7XG5cdFx0XHRjYXRzLmZvckVhY2goY2F0ID0+IHtcblx0XHRcdFx0Y29uc3QgYyA9IGNhdGVnb3JpZXNbY2F0ZWdvcnlOYW1lXVtjYXRdO1xuXHRcdFx0XHQoYy5jaGVja2VkKSA/IGMuY2hlY2tlZCA9IGZhbHNlIDogYy5jaGVja2VkID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoeyBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLCBzZWFyY2g6ICcnIH0pO1xuXHR9XG5cblx0Y2hhbmdlU2VhcmNoKHNlYXJjaFRlcm0pIHtcblx0XHR0aGlzLnNldFN0YXRlKHsgc2VhcmNoOiBzZWFyY2hUZXJtLCBjYXRlZ29yaWVzOiBnZXRCYXNlQ2F0ZWdvcmllcygpIH0pO1xuXHR9XG5cblx0Lypcblx0XHRSZXR1cm5zIGl0ZW1zIGZpbHRlcmVkIGJ5IHNlYXJjaCBvciBjYXRlZ29yeSBvciBub25lXG5cblx0XHRUT0RPISEhXG5cdFx0ZmlsdGVyVGFncyB3aXRoIGNhdGVnb3JpZXMgd2l0aCBtb3JlIHRoYW4gMSB0YWcgY2F1c2VzIGEgQU5EIGNvbmRpdGlvblxuXHRcdGJ1dCBpdCBzaG91bGQgYmUgYW4gT1IgY29uZGl0aW9uIEp1bmdsZSBhbmQgVmlzaW9uICYgVHJpbmtldFxuXHRcdG1lYW5zIGl0IG1hdGNoZXMgW2p1bmdsZSwgdmlzaW9uLCB0cmlua2V0XVxuXHRcdGJ1dCBpdCBzaG91bGQgYmUgW2p1bmdsZV0gYW5kIFt2aXNpb24gT1IgdHJpbmtldF1cblx0ICovXG5cdGdldEl0ZW1zKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5pdGVtcykge1xuXHRcdFx0cmV0dXJuIFtdO1xuXHRcdH1cblx0XHQvLyB3ZSBjb3VsZCBqdXN0IGxlYXZlIGZpbHRlckJ5IGFzICdzZWFyY2gnIGJ5IGRlZmF1bHRcblx0XHQvLyBzaW5jZSBpdCB3aWxsIGFsc28gcmV0dXJuIGFsbCBpdGVtcyBpZiBzZWFyY2ggPT09ICcnXG5cdFx0Ly8gYnV0IGkgZmlndXJlIGl0IHdpbGwgYmUgbW9yZSBwZXJmb3JtYW50IGlmIHRoZXJlIGlzIG5vIGluZGV4T2YgY2hlY2tcblx0XHQvLyBmb3IgZXZlcnkgaXRlbVxuXHRcdGxldCBmaWx0ZXJCeTtcblx0XHRsZXQgZmlsdGVyVGFncyA9IFtdO1xuXG5cdFx0Ly8gY2hlY2sgaWYgaXQncyBieSBzZWFyY2ggZmlyc3QgdG8gYXZvaWQgbG9vcGluZyBjYXRlZ29yaWVzIGZvciB0YWdzXG5cdFx0aWYgKHRoaXMuc3RhdGUuc2VhcmNoICYmIHRoaXMuc3RhdGUuc2VhcmNoICE9PSAnJykge1xuXHRcdFx0ZmlsdGVyQnkgPSAnc2VhcmNoJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0T2JqZWN0LmtleXModGhpcy5zdGF0ZS5jYXRlZ29yaWVzKS5mb3JFYWNoKGtleSA9PiB7XG5cdFx0XHRcdHRoaXMuc3RhdGUuY2F0ZWdvcmllc1trZXldLmZvckVhY2goY2F0ID0+IHtcblx0XHRcdFx0XHRpZiAoY2F0LmNoZWNrZWQpIHtcblx0XHRcdFx0XHRcdGNhdC50YWdzLmZvckVhY2godGFnID0+IGZpbHRlclRhZ3MucHVzaCh0YWcpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChmaWx0ZXJUYWdzLmxlbmd0aCkgZmlsdGVyQnkgPSAndGFncyc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucHJvcHMuaXRlbXMpLnJlZHVjZSgociwgaXRlbUlEKSA9PiB7XG5cdFx0XHRjb25zdCBpdGVtID0gdGhpcy5wcm9wcy5pdGVtc1tpdGVtSURdO1xuXHRcdFx0Ly8gZmlsdGVyIGJ5IHNlYXJjaCBvciB0YWdzIG9yIG5vbmVcblx0XHRcdGlmIChmaWx0ZXJCeSA9PT0gJ3NlYXJjaCcpIHtcblx0XHRcdFx0aWYgKGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodGhpcy5zdGF0ZS5zZWFyY2gudG9Mb3dlckNhc2UoKSkgIT09IC0xKSB7XG5cdFx0XHRcdFx0ci5wdXNoKGl0ZW0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGFsc28gdXNlIHNlYXJjaCB0ZXJtIG9uIHRhZ3Ncblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBpdGVtLnRhZ3MuZmlsdGVyKHRhZyA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGFnLnRvTG93ZXJDYXNlKCkgPT09IHRoaXMuc3RhdGUuc2VhcmNoLnRvTG93ZXJDYXNlKClcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRpZiAocmVzdWx0Lmxlbmd0aCkgci5wdXNoKGl0ZW0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSBpZiAoZmlsdGVyQnkgPT09ICd0YWdzJykge1xuXHRcdFx0XHQvLyBoYXZlIHRvIGhhdmUgZXZlcnkgdGFnIGluIGZpbHRlclRhZ3Ncblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gZmlsdGVyVGFncy5maWx0ZXIoZlRhZyA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIGl0ZW0udGFncy5maWx0ZXIoaVRhZyA9PiB7XG5cdFx0XHRcdFx0XHQvLyB3ZSBsb3dlcmNhc2UgY2hlY2sganVzdCBpbiBjYXNlIHJpb3QgYXBpIGRhdGFcblx0XHRcdFx0XHRcdC8vIGlzbid0IHVuaWZvcm1lZCBhbmQgaGFzIHNvbWUgdGFncyB3aXRoIHdlaXJkIGNhc2luZ1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZUYWcudG9Mb3dlckNhc2UoKSA9PT0gaVRhZy50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdH0pLmxlbmd0aDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlmIChyZXN1bHQubGVuZ3RoID09PSBmaWx0ZXJUYWdzLmxlbmd0aCkgci5wdXNoKGl0ZW0pO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiByO1xuXHRcdH0sIFtdKTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9eydjb2wteHMtNSBjb2wtc20tNSBjb2wtbWQtNScgKyB0aGlzLnN0eWxlcy5pdGVtRGlzcGxheVdyYXBwZXJ9PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTEyIGNvbC1zbS0xMiBjb2wtbWQtMTInPlxuXHRcdFx0XHRcdFx0PEl0ZW1TZWFyY2ggc2VhcmNoVmFsdWU9e3RoaXMuc3RhdGUuc2VhcmNofSBvblNlYXJjaD17dGhpcy5jaGFuZ2VTZWFyY2guYmluZCh0aGlzKX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy03IGNvbC1zbS03IGNvbC1tZC03Jz5cblx0XHRcdFx0XHRcdDxJdGVtQ2F0ZWdvcmllcyBjYXRlZ29yaWVzPXt0aGlzLnN0YXRlLmNhdGVnb3JpZXN9IG9uQ2F0ZWdvcnlDaGVjaz17dGhpcy5jaGFuZ2VDYXRlZ29yaWVzLmJpbmQodGhpcyl9IC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy01IGNvbC1zbS01IGNvbC1tZC01Jz5cblx0XHRcdFx0XHRcdDxJdGVtRGlzcGxheSBpdGVtcz17dGhpcy5nZXRJdGVtcygpfSAvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1EaXNwbGF5V2lkZ2V0OyIsIi8qXG5cdEl0ZW0gY2F0ZWdvcmllcyBmaWx0ZXIgZm9yIGl0ZW1EaXNwbGF5XG4gKi9cblxuY2xhc3MgSXRlbUNhdGVnb3JpZXMgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLmhhbmRsZUNoYW5nZSA9IHRoaXMuaGFuZGxlQ2hhbmdlLmJpbmQodGhpcyk7XG5cblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdpdGVtLWNhdGVnb3J5LXdyYXAnLFxuXHRcdFx0cGFyZW50Q2F0ZWdvcnk6ICdjYXRlZ29yeS13cmFwJywgLy8gd3JhcHBlclxuXHRcdFx0c3ViQ2F0ZWdvcnk6ICdzdWItY2F0ZWdvcnktd3JhcCB4Zm9udC10aGluJywgLy8gd3JhcHBlclxuXHRcdFx0cGFyZW50Q2F0ZWdvcnlUaXRsZTogJ3hmb250IGNhdGVnb3J5LXRpdGxlIHRleHQtY2VudGVyJyxcblx0XHR9O1xuXHR9XG5cblx0Lypcblx0XHRXaGVuIGEgc3ViIGNhdGVnb3J5IGlzIGNsaWNrZWRcblx0ICovXG5cdGhhbmRsZUNoYW5nZShldmVudCkge1xuXHRcdC8vIFtrZXksIGluZGV4IGZvciBrZXldIGllOiBjYXRlZ29yaWVzWydTdGFydGluZyBMYW5lJ11bMV0gZm9yIExhbmVcblx0XHRjb25zdCBjYXRlZ29yeUlkID0gZXZlbnQudGFyZ2V0LnZhbHVlLnNwbGl0KCcsJyk7XG5cdFx0Y29uc3QgY2F0ZWdvcnlOYW1lID0gY2F0ZWdvcnlJZFswXTtcblx0XHRjb25zdCBzdWJDYXRlZ29yeSA9IHBhcnNlSW50KGNhdGVnb3J5SWRbMV0pO1xuXG5cdFx0dGhpcy5wcm9wcy5vbkNhdGVnb3J5Q2hlY2soY2F0ZWdvcnlOYW1lLCBzdWJDYXRlZ29yeSk7XG5cdH1cblxuXHQvKlxuXHRcdFdoZW4gYSBtYWluIGNhdGVnb3J5IGlzIGNsaWNrZWRcblx0ICovXG5cdGhhbmRsZUNhdGVnb3J5KGNhdGVnb3J5TmFtZSkge1xuXHRcdHRoaXMucHJvcHMub25DYXRlZ29yeUNoZWNrKGNhdGVnb3J5TmFtZSk7XG5cdH1cblxuXHRyZW5kZXJTdWJDYXRlZ29yaWVzKGNhdGVnb3JpZXMsIHBhcmVudENhdGVnb3J5KSB7XG5cdFx0cmV0dXJuIGNhdGVnb3JpZXMubWFwKChjYXQsIGlkeCkgPT4ge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PGRpdiBrZXk9e2NhdC5uYW1lfSBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLnN1YkNhdGVnb3J5fT5cblx0XHRcdFx0XHQ8bGFiZWw+XG5cdFx0XHRcdFx0XHQ8aW5wdXQgdHlwZT0nY2hlY2tib3gnIHZhbHVlPXtbcGFyZW50Q2F0ZWdvcnksIGlkeF19IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUNoYW5nZX0gY2hlY2tlZD17Y2F0LmNoZWNrZWR9IC8+IHtjYXQubmFtZX1cblx0XHRcdFx0XHQ8L2xhYmVsPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblx0XG5cdHJlbmRlckNhdGVnb3JpZXMoKSB7XG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucHJvcHMuY2F0ZWdvcmllcykubWFwKGtleSA9PiB7XG5cdFx0XHRjb25zdCBzdWJDYXRlZ29yaWVzID0gdGhpcy5wcm9wcy5jYXRlZ29yaWVzW2tleV07XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGtleT17a2V5fSBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLnBhcmVudENhdGVnb3J5fT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLnBhcmVudENhdGVnb3J5VGl0bGV9IG9uQ2xpY2s9e3RoaXMuaGFuZGxlQ2F0ZWdvcnkuYmluZCh0aGlzLCBrZXkpfT57a2V5fTwvc3Bhbj5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJTdWJDYXRlZ29yaWVzKHN1YkNhdGVnb3JpZXMsIGtleSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTsgXG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMud3JhcHBlcn0+XG5cdFx0XHR7dGhpcy5yZW5kZXJDYXRlZ29yaWVzKCl9XG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1DYXRlZ29yaWVzOyIsIi8qXG5cdERpc3BsYXlzIGFsbCBhdmFpbGFibGUgb3IgZmlsdGVyZWQgKGJ5IHNlYXJjaCBvciBjYXRlZ29yaWVzKSBpdGVtc1xuICovXG5cbmltcG9ydCBJdGVtQnV0dG9uIGZyb20gJy4uLy4uL2l0ZW1CdXR0b24nO1xuXG5jbGFzcyBJdGVtRGlzcGxheSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdpdGVtLWRpc3BsYXktd3JhcCdcblx0XHR9O1xuXHR9XG5cblx0cmVuZGVySXRlbXMoKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvcHMuaXRlbXMubWFwKGl0ZW0gPT4ge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PEl0ZW1CdXR0b24ga2V5PXtpdGVtLmlkfSBpdGVtPXtpdGVtfSAvPlxuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgaWQ9J2l0ZW0tZGlzcGxheScgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfT5cblx0XHRcdHt0aGlzLnJlbmRlckl0ZW1zKCl9XHRcblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbURpc3BsYXk7IiwiLypcblx0U2VhcmNoIGJhciBmb3IgaXRlbURpc3BsYXlcbiAqL1xuXG5jbGFzcyBJdGVtU2VhcmNoIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1x0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdpbnB1dC1ncm91cCBpbnB1dC1ncm91cC1zbScsXG5cdFx0XHRzZWFyY2hCYXI6ICdmb3JtLWNvbnRyb2wnXG5cdFx0fTtcblx0fVxuXG5cdGhhbmRsZVNlYXJjaChldmVudCkge1xuXHRcdHRoaXMucHJvcHMub25TZWFyY2goZXZlbnQudGFyZ2V0LnZhbHVlKTtcblx0fVxuXG4gIC8vIHdoeSBkbyBpIG5lZWQgdG8gYmluZCB0aGlzLmhhbmRsZVNlYXJjaCBhbmQgaW4gdGhlIHBhcmVudCBoYW5kbGVyIGZ1bmN0aW9uPyBFUzYgY2xhc3Nlcz9cbiAgLy8gUmVhY3QgYXV0byBkaWQgdGhpcyBmb3IgbWUgd2l0aCBSZWFjdC5jcmVhdGVDbGFzc1xuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMud3JhcHBlcn0+XG5cdFx0XHQ8aW5wdXQgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5zZWFyY2hCYXJ9IHR5cGU9J3RleHQnIHBsYWNlaG9sZGVyPSdTZWFyY2ggSXRlbXMnIG9uQ2hhbmdlPXt0aGlzLmhhbmRsZVNlYXJjaC5iaW5kKHRoaXMpfSB2YWx1ZT17dGhpcy5wcm9wcy5zZWFyY2hWYWx1ZX0gLz5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbVNlYXJjaDsiLCJjbGFzcyBDaGFtcGlvblNlbGVjdCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc2VhcmNoQ2hhbXBpb25zID0gdGhpcy5zZWFyY2hDaGFtcGlvbnMuYmluZCh0aGlzKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGNoYW1waW9uRHJvcERvd25XcmFwOiAnaXRlbS1jaGFtcGlvbi1kcm9wZG93bi13cmFwJyxcblx0XHRcdGNoYW1waW9uRHJvcERvd246ICdpdGVtLWNoYW1waW9uLWRyb3Bkb3duJyxcblx0XHRcdGhpZGU6ICdoaWRkZW4nLFxuXHRcdFx0aW1hZ2VDaGFtcGlvbjogJ2l0ZW0tY2hhbXBpb24taW1hZ2UnLFxuXHRcdFx0Ly8gd3JhcHBlciwgY291bGQgYmUgbmFtZSBvciBpbnB1dCBib3hcblx0XHRcdGNoYW1waW9uTmFtZTogJ2l0ZW0tY2hhbXBpb24tbmFtZS13cmFwIHhmb250J1xuXHRcdH07XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0c2VhcmNoVmFsdWU6ICcnLFxuXHRcdFx0c2hvd0Ryb3BEb3duOiBmYWxzZVxuXHRcdH07XG5cdH1cblxuXHRvbkRyb3BEb3duKGJvb2wsIGV2ZW50KSB7XG5cdFx0Y29uc3QgdGhhdCA9IHRoaXM7XG5cdFx0Y29uc3Qgc2V0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGF0LnNldFN0YXRlKHsgc2hvd0Ryb3BEb3duOiBib29sIH0pO1xuXHRcdH1cblxuXHRcdC8vIGhhY2t5IHdheSB0byBnZXQgbW91c2UgY2xpY2tzIHRvIHRyaWdnZXIgZmlyc3QgYmVmb3JlIG9uQmx1clxuXHRcdGlmICghYm9vbCkge1xuXHRcdFx0c2V0VGltZW91dChzZXQsIDIwMCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNldCgpO1xuXHRcdH1cblx0fVxuXG5cdHNlYXJjaENoYW1waW9ucyhldmVudCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBzZWFyY2hWYWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlIH0pO1xuXHR9XG5cdFxuXHQvKiBcblx0XHRXaGVuIHVzZXIgcHJlc3NlcyBlbnRlciwgd2UgbmVlZCB0byB2ZXJpZnkgaWYgdGhlIGNoYW1waW9uIGFjdHVhbGx5IGV4aXN0c1xuXHRcdERvIG5vdGhpbmcgaWYgaXQgZG9lcyBub3Rcblx0Ki9cblx0aGFuZGxlU3VibWl0KGV2ZW50KSB7XG5cdFx0aWYgKGV2ZW50LndoaWNoID09PSAxMykgeyAvLyBlbnRlclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBldmVudC50YXJnZXQudmFsdWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdGNvbnN0IGNoYW1wID0gQ2hhbXBpb25EYXRhLmZpbHRlcihjaGFtcGlvbiA9PiB7XG5cdFx0XHRcdHJldHVybiBjaGFtcGlvbi5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IGlucHV0IHx8IGNoYW1waW9uLnJpb3RLZXkudG9Mb3dlckNhc2UoKSA9PT0gaW5wdXQ7XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKGNoYW1wLmxlbmd0aCkge1xuXHRcdFx0XHR0aGlzLm9uQ2hhbXBpb25TZWxlY3QoY2hhbXBbMF0pO1xuXHRcdFx0XHR0aGlzLnNldFN0YXRlKHsgc2VhcmNoVmFsdWU6ICcnLCBzaG93RHJvcERvd246IGZhbHNlIH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdG9uQ2hhbXBpb25TZWxlY3QoY2hhbXBpb24pIHtcblx0XHR0aGlzLnByb3BzLmhhbmRsZUNoYW1waW9uU2VsZWN0KGNoYW1waW9uKTtcblx0fVxuXG5cdHJlbmRlclNlYXJjaFJlc3VsdHNJdGVtcygpIHtcblx0XHRjb25zdCBzZWFyY2hUZXJtID0gdGhpcy5zdGF0ZS5zZWFyY2hWYWx1ZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGxldCBjaGFtcGlvbnMgPSBDaGFtcGlvbkRhdGE7XG5cblx0XHQvLyBmaXJzdCBmaWx0ZXIgYnkgc2VhcmNoXHRcdFxuXHRcdGlmIChzZWFyY2hUZXJtKSB7XG5cdFx0XHRjaGFtcGlvbnMgPSBDaGFtcGlvbkRhdGEuZmlsdGVyKGNoYW1wID0+IHtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGNoYW1wLm5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0Y29uc3Qga2V5bmFtZSA9IGNoYW1wLnJpb3RLZXkudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0cmV0dXJuIG5hbWUuaW5kZXhPZihzZWFyY2hUZXJtKSA9PT0gMCB8fCBrZXluYW1lLmluZGV4T2Yoc2VhcmNoVGVybSkgPT0gMDtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIHNvcnQgYnkgbmFtZSAvIGZpcnN0IGxldHRlciBvZiBuYW1lXG5cdFx0Y2hhbXBpb25zLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0Y29uc3QgYWEgPSBhLm5hbWVbMF0uY2hhckNvZGVBdCgpO1xuXHRcdFx0Y29uc3QgYmIgPSBiLm5hbWVbMF0uY2hhckNvZGVBdCgpO1xuXHRcdFx0aWYgKGFhID4gYmIpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9IGVsc2UgaWYgKGJiID4gYWEpIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gd2Ugb25seSBzaG93IHRoZSBmaXJzdCAxMCBvZiB0aGUgcmVzdWx0c1xuXHRcdGxldCBjaGFtcGlvbnNsaW1pdCA9IGNoYW1waW9ucy5zbGljZSgwLCAxMCk7XG5cblx0XHRyZXR1cm4gY2hhbXBpb25zbGltaXQubWFwKGNoYW1waW9uID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxsaSBrZXk9e2NoYW1waW9uLnJpb3RJZH0gb25DbGljaz17dGhpcy5vbkNoYW1waW9uU2VsZWN0LmJpbmQodGhpcywgY2hhbXBpb24pfT5cblx0XHRcdFx0XHQ8aW1nIHNyYz17J2h0dHA6Ly9kZHJhZ29uLmxlYWd1ZW9mbGVnZW5kcy5jb20vY2RuLycgKyB0aGlzLnByb3BzLmFwaVZlcnNpb24gKyAnL2ltZy9jaGFtcGlvbi8nICsgY2hhbXBpb24ucmlvdEtleSArICcucG5nJ30gLz5cblx0XHRcdFx0XHQ8c3Bhbj57Y2hhbXBpb24ubmFtZX08L3NwYW4+XG5cdFx0XHRcdDwvbGk+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVuZGVyU2VhcmNoUmVzdWx0cygpIHtcblx0XHRsZXQgY2xzID0gdGhpcy5zdHlsZXMuY2hhbXBpb25Ecm9wRG93bldyYXA7XG5cdFx0aWYgKCF0aGlzLnN0YXRlLnNob3dEcm9wRG93bikge1xuXHRcdFx0Y2xzICs9ICcgJyArIHRoaXMuc3R5bGVzLmhpZGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXtjbHN9PlxuXHRcdFx0XHQ8dWwgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5jaGFtcGlvbkRyb3BEb3dufT5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJTZWFyY2hSZXN1bHRzSXRlbXMoKX1cblx0XHRcdFx0PC91bD5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0bGV0IGltYWdlVXJsID0gJ2h0dHA6Ly9kZHJhZ29uLmxlYWd1ZW9mbGVnZW5kcy5jb20vY2RuLycgKyB0aGlzLnByb3BzLmFwaVZlcnNpb24gKyAnL2ltZy9jaGFtcGlvbi8nICsgdGhpcy5wcm9wcy5jaGFtcGlvbi5yaW90S2V5ICsgJy5wbmcnO1xuXHRcdGxldCBpbWFnZUNoYW1waW9uID0gdGhpcy5zdHlsZXMuaW1hZ2VDaGFtcGlvbjtcblxuXHRcdGxldCByZW5kZXJQaWNrZXJPckNoYW1waW9uID0gKDxoMj57dGhpcy5wcm9wcy5jaGFtcGlvbi5uYW1lfTwvaDI+KTtcblxuXHRcdGlmICghdGhpcy5wcm9wcy5jaGFtcGlvbi5yaW90SWQpIHtcblx0XHRcdGltYWdlVXJsID0gJ2h0dHA6Ly9kZHJhZ29uLmxlYWd1ZW9mbGVnZW5kcy5jb20vY2RuLzUuMi4xL2ltZy91aS9jaGFtcGlvbi5wbmcnO1xuXHRcdFx0aW1hZ2VDaGFtcGlvbiA9ICdkZWZhdWx0LWNoYW1waW9uJ1xuXHRcdFx0Ly8gcmVuZGVyIHRoZSBjaGFtcGlvbiBwaWNrZXJcblx0XHRcdHJlbmRlclBpY2tlck9yQ2hhbXBpb24gPSAoXG5cdFx0XHRcdFx0PGRpdiBvbkJsdXI9e3RoaXMub25Ecm9wRG93bi5iaW5kKHRoaXMsIGZhbHNlKX0+XG5cdFx0XHRcdFx0PGlucHV0IHR5cGU9J3RleHQnIHBsYWNlaG9sZGVyPSdQaWNrIGEgQ2hhbXBpb24gZm9yIHRoaXMgYnVpbGQnIHZhbHVlPXt0aGlzLnN0YXRlLnNlYXJjaFZhbHVlfSBvbkNoYW5nZT17dGhpcy5zZWFyY2hDaGFtcGlvbnN9IG9uRm9jdXM9e3RoaXMub25Ecm9wRG93bi5iaW5kKHRoaXMsIHRydWUpfSBvbktleVVwPXt0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpfSBvbktleURvd249e3RoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyl9IC8+XG5cdFx0XHRcdFx0e3RoaXMucmVuZGVyU2VhcmNoUmVzdWx0cygpfVxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHRcdDxpbWcgY2xhc3NOYW1lPXtpbWFnZUNoYW1waW9ufSBzcmM9e2ltYWdlVXJsfSAvPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY2hhbXBpb25OYW1lfT5cblx0XHRcdFx0e3JlbmRlclBpY2tlck9yQ2hhbXBpb259XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IENoYW1waW9uU2VsZWN0OyIsImNsYXNzIENyZWF0ZUJsb2NrIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHRpdGVtQmxvY2s6ICdpdGVtLWJsb2NrJyxcblx0XHRcdGl0ZW1fYmxvY2tfYWRkOiAnaXRlbS1zZXQtYWRkLWJsb2NrJ1xuXHRcdH1cblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucHJvcHMuYWRkRHJhZyh0aGlzLnJlZnMuZHJhZy5nZXRET01Ob2RlKCkpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0PGRpdiByZWY9J2RyYWcnIGlkPSdjcmVhdGUtYmxvY2snIGNsYXNzTmFtZT17J3JvdyAnICsgdGhpcy5zdHlsZXMuaXRlbUJsb2NrfSBvbkNsaWNrPXt0aGlzLnByb3BzLmhhbmRsZXJDcmVhdGV9PlxuXHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLml0ZW1fYmxvY2tfYWRkfT5cblx0XHRcdFx0RHJhZyBJdGVtcyBIZXJlIHRvIENyZWF0ZSBhIE5ldyBCbG9ja1xuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XHRcblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ3JlYXRlQmxvY2s7XHRcbiIsImltcG9ydCBDaGFtcGlvblNlbGVjdCBmcm9tICcuL2NoYW1waW9uU2VsZWN0JztcbmltcG9ydCBJdGVtQmxvY2tzIGZyb20gJy4vaXRlbUJsb2Nrcyc7XG5pbXBvcnQgSXRlbVNldFVwbG9hZCBmcm9tICcuL3VwbG9hZCc7XG5pbXBvcnQgQ3JlYXRlQmxvY2sgZnJvbSAnLi9jcmVhdGVCbG9jayc7XG5pbXBvcnQgTWFwU2VsZWN0IGZyb20gJy4vbWFwU2VsZWN0JztcbmltcG9ydCBTaGFyZSBmcm9tICcuLi8uLi9zaGFyZSc7XG5pbXBvcnQgRG93bmxvYWQgZnJvbSAnLi4vLi4vZG93bmxvYWQnO1xuXG52YXIgZHJhZ3VsYSA9IHJlcXVpcmUoJy4uLy4uL2RyYWd1bGEvcmVhY3QtZHJhZ3VsYScpO1xuXG5jbGFzcyBJdGVtU2V0V2lkZ2V0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0aXRlbVNldFdyYXBwZXI6ICcnLFxuXHRcdFx0aXRlbUJsb2NrOiAnaXRlbS1ibG9jaycsXG5cdFx0XHRpdGVtX2Jsb2NrX2FkZDogJ2l0ZW0tc2V0LWFkZC1ibG9jaycsXG5cdFx0XHRidXR0b25TYXZlOiAnYnRuIGJ0bi1kZWZhdWx0J1xuXHRcdH07XG5cblx0XHR0aGlzLnN0YXRlID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXG5cdFx0dGhpcy50b2tlbiA9IDA7XG5cdFx0dGhpcy50b2tlbklkID0gMDtcblxuXHRcdHRoaXMuZHIgPSBkcmFndWxhKHtcblx0XHRcdGNvcHk6IGZhbHNlXG5cdFx0fSk7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRva2VuID0gaXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKHRoaXMuX29uQ2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdHRoaXMudG9rZW5TYXZlU3RhdHVzID0gYXBwU3RvcmUuYWRkTGlzdGVuZXIoJ3NhdmVTdGF0dXMnLCB0aGlzLl9vblNhdmUuYmluZCh0aGlzKSk7XG5cblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblx0XHR0aGlzLmRyLmNvbnRhaW5lcnMucHVzaChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaXRlbS1kaXNwbGF5JykpO1xuXG5cdFx0dGhpcy5kci5vbignZHJvcCcsIGZ1bmN0aW9uKGVsLCB0YXJnZXQsIHNyYykge1xuXHRcdFx0Y29uc3QgaWQgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaXRlbS1pZCcpO1xuXHRcdFx0Y29uc3QgaWR4ID0gdGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS1ibG9jay1pZHgnKTtcblx0XHRcdGlmICgoaWR4ID09PSAwIHx8IGlkeCApICYmIHNyYy5pZCA9PSAnaXRlbS1kaXNwbGF5JyAmJiB0YXJnZXQuaWQgIT0gJ2l0ZW0tZGlzcGxheScpIHtcblx0XHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5hZGRfaXRlbXNldF9pdGVtKGlkeCwgaWQpKTtcblx0XHRcdH0gZWxzZSBpZiAoc3JjLmlkID09ICdpdGVtLWRpc3BsYXknICYmIHRhcmdldC5pZCA9PSdjcmVhdGUtYmxvY2snKSB7XG5cdFx0XHRcdHRoYXQub25DcmVhdGVCbG9jayhbXG5cdFx0XHRcdFx0eyBpZDogaWQsIGNvdW50OiAxIH1cblx0XHRcdFx0XSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpdGVtU2V0U3RvcmUucmVtb3ZlTGlzdGVuZXIoJycsIHRoaXMudG9rZW4pO1xuXHRcdGFwcFN0b3JlLnJlbW92ZUxpc3RlbmVyKCdzYXZlU3RhdHVzJywgdGhpcy50b2tlblNhdmVTdGF0dXMpO1xuXHR9XG5cblx0X29uU2F2ZSgpIHtcblx0XHRjb25zdCBzYXZlU3RhdHVzID0gYXBwU3RvcmUuZ2V0QWxsKCkuc2F2ZVN0YXR1cztcblx0XHQvLyBjaGVjayBpZiB0aGUgc2F2ZSB3YXMgc3VjY2Vzc2Z1bCAmIGlmIGl0IHdhcyByZWFsbHkgYSBzYXZlIGV2ZW50XG5cdFx0aWYgKHNhdmVTdGF0dXMgJiYgc2F2ZVN0YXR1cy5pZCAmJiBzYXZlU3RhdHVzLm1zZyA9PT0gJ29rJykge1xuXHRcdFx0dGhpcy5jb250ZXh0LnJvdXRlci50cmFuc2l0aW9uVG8oJ2VkaXQnLCB7aWQ6IHNhdmVTdGF0dXMuaWR9KTtcblx0XHR9XG5cdH1cblxuXHRfb25DaGFuZ2UoKSB7XG5cdFx0Y29uc3QgZGF0YSA9IGl0ZW1TZXRTdG9yZS5nZXRBbGwoKTtcblx0XHR0aGlzLnNldFN0YXRlKGRhdGEpO1xuXHR9XG5cblx0YWRkRHJhZ0NvbnRhaW5lcihlbCkge1xuXHRcdHRoaXMuZHIuY29udGFpbmVycy5wdXNoKGVsKTtcblx0fVxuXG5cdGNoYW5nZVRpdGxlKGV2ZW50KSB7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy51cGRhdGVfaXRlbXNldF90aXRsZShldmVudC50YXJnZXQudmFsdWUpKTtcblx0fVxuXG5cdGNoYW5nZVR5cGUoYmxvY2tJZHgsIHR4dCkge1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMudXBkYXRlX2l0ZW1zZXRfYmxvY2tfdHlwZShibG9ja0lkeCwgdHh0KSk7XG5cdH1cblxuXHRjaGFuZ2VNYXAobWFwa2V5KSB7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5zZWxlY3RfbWFwKG1hcGtleSkpO1xuXHR9XG5cblx0b25DcmVhdGVCbG9jayhpdGVtcywgZXZlbnQpIHtcblx0XHR2YXIgaSA9IFtdO1xuXHRcdGlmICghZXZlbnQpIGkgPSBpdGVtcztcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmNyZWF0ZV9pdGVtc2V0X2Jsb2NrKHtcblx0XHRcdHR5cGU6ICcnLFxuXHRcdFx0cmVjTWF0aDogZmFsc2UsXG5cdFx0XHRtaW5TdW1tb25lckxldmVsOiAtMSxcblx0XHRcdG1heFN1bW1tb25lckxldmVsOiAtMSxcblx0XHRcdHNob3dJZlN1bW1vbmVyU3BlbGw6ICcnLFxuXHRcdFx0aGlkZUlmU3VtbW9uZXJTcGVsbDogJycsXG5cdFx0XHRpdGVtczogaVxuXHRcdH0pKTtcblx0fVxuXG5cdG9uUmVtb3ZlQmxvY2soaWR4KSB7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5kZWxldGVfaXRlbXNldF9ibG9jayhpZHgpKTtcblx0fVxuXHRcblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J2NvbC14cy02IGNvbC1zbS02IGNvbC1tZC02JyArIHRoaXMuc3R5bGVzLml0ZW1TZXRXcmFwcGVyfT5cblx0XHRcdFxuXHRcdFx0XHQ8U2hhcmUgaWQ9e3RoaXMuc3RhdGUuaWR9IHNob3c9e3RoaXMucHJvcHMuc2hvd1NoYXJlfSAvPlxuXHRcdFx0XHQ8RG93bmxvYWQgc2hvdz17dGhpcy5wcm9wcy5zaG93RG93bmxvYWR9IGlkPXt0aGlzLnN0YXRlLmlkfSBkYXRhPXt0aGlzLnN0YXRlLml0ZW1zZXR9IC8+XG5cblx0XHRcdFx0PEl0ZW1TZXRVcGxvYWQgc2hvdz17dGhpcy5zdGF0ZS5zaG93RmlsZVVwbG9hZH0gLz5cblxuXHRcdFx0XHQ8YnIgLz5cblxuXHRcdFx0XHQ8Q2hhbXBpb25TZWxlY3QgaGFuZGxlQ2hhbXBpb25TZWxlY3Q9e3RoaXMucHJvcHMuaGFuZGxlQ2hhbXBpb25TZWxlY3R9IGFwaVZlcnNpb249e3RoaXMucHJvcHMuYXBpVmVyc2lvbn0gY2hhbXBpb249e3RoaXMucHJvcHMuY2hhbXBpb259IC8+XG5cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdDxNYXBTZWxlY3QgbWFwPXt0aGlzLnN0YXRlLml0ZW1zZXQubWFwfSBoYW5kbGVDaGFuZ2U9e3RoaXMuY2hhbmdlTWFwLmJpbmQodGhpcyl9IC8+XG5cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdDxpbnB1dCBjbGFzc05hbWU9J2Zvcm0tY29udHJvbCcgdHlwZT0ndGV4dCcgdmFsdWU9e3RoaXMuc3RhdGUuaXRlbXNldC50aXRsZX0gcGxhY2Vob2xkZXI9J05hbWUgeW91ciBpdGVtIHNldCBidWlsZCcgb25DaGFuZ2U9e3RoaXMuY2hhbmdlVGl0bGUuYmluZCh0aGlzKX0gLz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxiciAvPlxuXG5cdFx0XHRcdDxJdGVtQmxvY2tzIGFkZERyYWc9e3RoaXMuYWRkRHJhZ0NvbnRhaW5lci5iaW5kKHRoaXMpfSBibG9ja3M9e3RoaXMuc3RhdGUuaXRlbXNldC5ibG9ja3N9IGhhbmRsZUJsb2NrVHlwZT17dGhpcy5jaGFuZ2VUeXBlLmJpbmQodGhpcyl9IGhhbmRsZVJlbW92ZUJsb2NrPXt0aGlzLm9uUmVtb3ZlQmxvY2suYmluZCh0aGlzKX0gLz5cblxuXHRcdFx0XHQ8Q3JlYXRlQmxvY2sgYWRkRHJhZz17dGhpcy5hZGREcmFnQ29udGFpbmVyLmJpbmQodGhpcyl9IGhhbmRsZXJDcmVhdGU9e3RoaXMub25DcmVhdGVCbG9jay5iaW5kKHRoaXMpfSAvPlxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuSXRlbVNldFdpZGdldC5jb250ZXh0VHlwZXMgPSB7XG5cdHJvdXRlcjogUmVhY3QuUHJvcFR5cGVzLmZ1bmNcbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbVNldFdpZGdldDsiLCJpbXBvcnQgSXRlbUJ1dHRvbiBmcm9tICcuLi8uLi9pdGVtQnV0dG9uJztcblxuY2xhc3MgSXRlbUJsb2NrIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0aXRlbUJsb2NrOiAnaXRlbS1ibG9jaycsXG5cdFx0XHRpdGVtX2Jsb2NrX3RpdGxlOiAnaXRlbS1zZXQtYmxvY2stdGl0bGUnLFxuXHRcdFx0aXRlbV9pY29uX2Jsb2NrOiAnaXRlbS1zZXQtYnV0dG9uLWJsb2NrJyxcblx0XHRcdGl0ZW1faWNvbl9jb3VudDogJ2l0ZW0tc2V0LWJ1dHRvbi1ibG9jay1jb3VudCcsXG5cdFx0fTtcblx0fVxuXHRcblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5wcm9wcy5hZGREcmFnKHRoaXMucmVmcy5kcmFnLmdldERPTU5vZGUoKSk7XG5cdH1cblxuXHRjaGFuZ2VUeXBlKGlkLCBpZHgsIGV2ZW50KSB7XG5cdFx0Y29uc29sZS5sb2coaWQpO1xuXHRcdHRoaXMucHJvcHMuaGFuZGxlQmxvY2tUeXBlKGlkeCwgZXZlbnQudGFyZ2V0LnZhbHVlKTtcblx0fVxuXG5cdG9uUmVtb3ZlQmxvY2soaWR4KSB7XG5cdFx0dGhpcy5wcm9wcy5oYW5kbGVSZW1vdmVCbG9jayhpZHgpO1xuXHR9XG5cblx0cmVuZGVySXRlbXMoaXRlbXMpIHtcblx0XHRyZXR1cm4gaXRlbXMubWFwKChpdGVtLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtpdGVtLmlkICsgJy0nICsgaWR4fSBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLml0ZW1faWNvbl9ibG9ja30+XG5cdFx0XHRcdFx0PEl0ZW1CdXR0b24gaXRlbUlkPXtpdGVtLmlkfSAvPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuaXRlbV9pY29uX2NvdW50fT57aXRlbS5jb3VudH08L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy5pdGVtQmxvY2t9PlxuXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J3JvdyAnICsgdGhpcy5zdHlsZXMuaXRlbV9ibG9ja190aXRsZX0+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtMTAgY29sLXNtLTEwIGNvbC1tZC0xMCc+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2lucHV0LWdyb3VwIGlucHV0LWdyb3VwLXNtJz5cblx0XHRcdFx0XHRcdDxpbnB1dCBjbGFzc05hbWU9J2Zvcm0tY29udHJvbCcgdHlwZT0ndGV4dCcgdmFsdWU9e3RoaXMucHJvcHMuYmxvY2sudHlwZX0gb25DaGFuZ2U9e3RoaXMuY2hhbmdlVHlwZS5iaW5kKHRoaXMsIHRoaXMucHJvcHMuYmxvY2suaWQsIHRoaXMucHJvcHMuaWR4KX0gcGxhY2Vob2xkZXI9J2V4cGxhaW4gdGhpcyBpdGVtIHJvdycgLz5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdpbnB1dC1ncm91cC1hZGRvbic+XG5cdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cImdseXBoaWNvbiBnbHlwaGljb24tcGVuY2lsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtMSBjb2wtc20tMSBjb2wtbWQtMSc+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmVcIiBvbkNsaWNrPXt0aGlzLm9uUmVtb3ZlQmxvY2suYmluZCh0aGlzLCB0aGlzLnByb3BzLmlkeCl9Pjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHRcdDxkaXYgcmVmPSdkcmFnJyBkYXRhLWJsb2NrLWlkeD17dGhpcy5wcm9wcy5pZHh9IGNsYXNzTmFtZT0nY29sLXhzLTEyIGNvbC1zbS0xMiBjb2wtbWQtMTIgZHJhZy1jb250YWluZXInPlxuXHRcdFx0XHRcdHt0aGlzLnJlbmRlckl0ZW1zKHRoaXMucHJvcHMuYmxvY2suaXRlbXMpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1CbG9jazsiLCJpbXBvcnQgSXRlbUJsb2NrIGZyb20gJy4vaXRlbUJsb2NrJztcblxuY2xhc3MgSXRlbUJsb2NrcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRjb25zdCByZW5kZXJCbG9ja3MgPSB0aGlzLnByb3BzLmJsb2Nrcy5tYXAoKGJsb2NrLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxJdGVtQmxvY2sga2V5PXtibG9jay5pZCArICctJyArIGlkeH0gYmxvY2s9e2Jsb2NrfSBpZHg9e2lkeH0gYWRkRHJhZz17dGhpcy5wcm9wcy5hZGREcmFnfSBoYW5kbGVCbG9ja1R5cGU9e3RoaXMucHJvcHMuaGFuZGxlQmxvY2tUeXBlfSBoYW5kbGVSZW1vdmVCbG9jaz17dGhpcy5wcm9wcy5oYW5kbGVSZW1vdmVCbG9ja30gLz5cblx0XHRcdCk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdj5cblx0XHRcdFx0e3JlbmRlckJsb2Nrc31cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtQmxvY2tzO1x0XG4iLCJjbGFzcyBNYXBTZWxlY3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMubWFwcyA9IFtcblx0XHRcdHsga2V5OiAnYW55JywgbmFtZTogJ0FsbCBNYXBzJ30sXG5cdFx0XHR7IGtleTogJ1NSJywgbmFtZTogJ1N1bW1vbmVyXFwncyBSaWZ0J30sXG5cdFx0XHR7IGtleTogJ0hBJywgbmFtZTogJ0hvd2xpbmcgQWJ5c3MnfSxcblx0XHRcdHsga2V5OiAnVFQnLCBuYW1lOiAnVHdpc3RlZCBUcmVlbGluZSd9LFxuXHRcdFx0eyBrZXk6ICdDUycsIG5hbWU6ICdDcnlzdGFsIFNjYXInfVxuXHRcdF07XG5cdH1cblxuXHRyZW5kZXJNYXBPcHRpb25zKCkge1xuXHRcdHJldHVybiB0aGlzLm1hcHMubWFwKG1hcCA9PiB7XG5cdFx0XHRyZXR1cm4gKDxvcHRpb24ga2V5PXttYXAua2V5fSB2YWx1ZT17bWFwLmtleX0+e21hcC5uYW1lfTwvb3B0aW9uPik7XG5cdFx0fSk7XG5cdH1cblxuXHRvbkNoYW5nZShldmVudCkge1xuXHRcdHRoaXMucHJvcHMuaGFuZGxlQ2hhbmdlKGV2ZW50LnRhcmdldC52YWx1ZSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHRcdFx0PGxhYmVsPk1hcDogPC9sYWJlbD5cblx0XHRcdFx0XHQ8c2VsZWN0IG9uQ2hhbmdlPXt0aGlzLm9uQ2hhbmdlLmJpbmQodGhpcyl9IHZhbHVlPXt0aGlzLnByb3BzLm1hcH0+XG5cdFx0XHRcdFx0XHR7dGhpcy5yZW5kZXJNYXBPcHRpb25zKCl9XG5cdFx0XHRcdFx0PC9zZWxlY3Q+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTWFwU2VsZWN0OyIsImNsYXNzIEl0ZW1TZXRVcGxvYWQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGVyckRpc3BsYXk6ICd1cGxvYWQtZXJyb3InXG5cdFx0fVxuXG5cdFx0dGhpcy5oYW5kbGVVcGxvYWQgPSB0aGlzLmhhbmRsZVVwbG9hZC5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuaGFuZGxlU3VibWl0ID0gdGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKTtcblxuXHRcdHRoaXMuY2xlYXJFcnJUaW1lciA9IDA7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdGVycm9yOiAnJ1xuXHRcdH1cblx0fVxuXG5cdHZhbGlkYXRlUGFyc2VkKHBhcnNlZEpzb24pIHtcblx0XHQvLyBUT0RPIHZhbGlkYXRlXG5cdFx0Ly8gLi4uXG5cdFx0XG5cdFx0Ly8gb25jZSB2YWxpZGF0ZWQgc2F2ZSB0byBzdG9yZVxuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMudXBsb2FkX2l0ZW1zZXQocGFyc2VkSnNvbikpO1xuXHR9XG5cblx0aGFuZGxlRXJyb3IoZXJyLCBmaWxlbmFtZSkge1xuXHRcdGxldCBlcnJvciA9ICdVbmFibGUgdG8gcGFyc2UgdGhpcyBmaWxlLCBpdCBtYXliZSBub3QgdmFsaWQnO1xuXHRcdHN3aXRjaCAoZXJyLnRvU3RyaW5nKCkpIHtcblx0XHRcdGNhc2UgJ3Rvb2JpZyc6XG5cdFx0XHRcdGVycm9yID0gJ1RoZSBmaWxlXFwncyBzaXplIGlzIHRvbyBiaWcgYW5kIG1heSBub3QgYmUgdmFsaWQnXG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoeyBlcnJvcjogZmlsZW5hbWUgKyAnOiAnICsgZXJyb3IgfSk7XG5cdH1cblxuXHRjbGVhckVycm9yKCkge1xuXHRcdGlmICh0aGlzLmNsZWFyRXJyVGltZXIpIHtcblx0XHRcdGNsZWFySW50ZXJ2YWwodGhpcy5jbGVhckVyclRpbWVyKTtcblx0XHR9XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGVycm9yOiAnJyB9KTtcblx0fVxuXG5cdGhhbmRsZVVwbG9hZChldmVudCkge1xuXHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIHZhciBmaWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzWzBdO1xuXG4gICAgaWYgKGZpbGUuc2l6ZSA+IDE1MDAwKSB7XG4gICAgXHR0aGlzLmhhbmRsZUVycm9yKCd0b29iaWcnLCBmaWxlLm5hbWUpO1xuICAgIFx0cmV0dXJuO1xuICAgIH1cblxuICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbih1cGxvYWQpIHtcbiAgICBcdGxldCBwYXJzZWQ7XG4gICAgXHRsZXQgZXJyID0gJyc7XG5cdCAgICB0cnkge1xuXHRcdCAgICBwYXJzZWQgPSBKU09OLnBhcnNlKHVwbG9hZC50YXJnZXQucmVzdWx0KVxuXHRcdCAgfSBjYXRjaChlKSB7XG5cdFx0ICBcdGVyciA9IGU7XG5cdFx0ICB9XG5cdFx0ICBpZiAoZXJyIHx8ICFwYXJzZWQpIHtcblx0XHQgIFx0dGhhdC5oYW5kbGVFcnJvcihlcnIsIGZpbGUubmFtZSk7XG5cdFx0ICB9IGVsc2Uge1xuXHRcdCAgXHR0aGF0LnZhbGlkYXRlUGFyc2VkKHBhcnNlZCk7XG5cdFx0ICB9XG5cdFx0ICBjb25zdCBlbCA9IFJlYWN0LmZpbmRET01Ob2RlKHRoYXQucmVmcy5pbnB1dEVsZW0pO1xuXHRcdCAgaWYgKGVsKSBlbC52YWx1ZSA9ICcnO1xuICAgIH1cbiAgXHRyZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgfVxuXG5cdGhhbmRsZVN1Ym1pdChldmVudCkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0Ly8gZG9uJ3Qgc2hvdyB0aGUgdXBsb2FkIGZvcm0gaWYgdXNlciBhbHJlYWR5IHVwbG9hZGVkXG5cdFx0aWYgKCF0aGlzLnByb3BzLnNob3cpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRsZXQgZXJyb3I7XG5cdFx0Ly8gZmFkZSBhd2F5IGVycm9yc1xuXHRcdGlmICh0aGlzLnN0YXRlLmVycm9yKSB7XG5cdFx0XHQvLyBpZiB0aGVyZSdzIGEgcHJldmlvdXMgdGltZXIsIHN0b3AgaXQgZmlyc3Rcblx0XHRcdGlmICh0aGlzLmNsZWFyRXJyVGltZXIpIHtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLmNsZWFyRXJyVGltZXIpO1xuXHRcdFx0fVxuXHRcdFx0ZXJyb3IgPSAoPHNwYW4gY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5lcnJEaXNwbGF5fSBvbkNsaWNrPXt0aGlzLmNsZWFyRXJyb3IuYmluZCh0aGlzKX0+e3RoaXMuc3RhdGUuZXJyb3J9PC9zcGFuPik7XG5cdFx0XHR0aGlzLmNsZWFyRXJyVGltZXIgPSBzZXRUaW1lb3V0KHRoaXMuY2xlYXJFcnJvci5iaW5kKHRoaXMpLCAyNTAwKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdj5cblx0XHRcdDxmb3JtIG9uU3VibWl0PXt0aGlzLmhhbmRsZVN1Ym1pdH0gZW5jVHlwZT1cIm11bHRpcGFydC9mb3JtLWRhdGFcIj5cblx0XHRcdFx0PGlucHV0IHJlZj0naW5wdXRFbGVtJyB0eXBlPSdmaWxlJyBhY2NlcHQ9Jy5qc29uJyBvbkNoYW5nZT17dGhpcy5oYW5kbGVVcGxvYWR9IC8+XG5cdFx0XHQ8L2Zvcm0+XG5cdFx0XHR7ZXJyb3J9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbVNldFVwbG9hZDtcdFxuIiwiY2xhc3MgU2F2ZVJlc3VsdCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdwb3B1cC13cmFwcGVyJyxcblx0XHRcdGNvbnRhaW5lcjogJ3BvcHVwLWNvbnRhaW5lcicsXG5cblx0XHRcdGNvbXBvbmVudENvbnRhaW5lcjogJ3NhdmUtcmVzdWx0LWNvbnRhaW5lcicsXG5cdFx0XHRpY29uOiAnc2F2ZS1yZXN1bHQtaWNvbicsXG5cdFx0XHRtZXNzYWdlOiAnc2F2ZS1yZXN1bHQtbWVzc2FnZScsXG5cdFx0XHRyZW1vdmVCdXR0b246ICdzYXZlLXJlc3VsdC1idXR0b24nLFxuXHRcdFx0Z3JlZW46ICdmb250LWdyZWVuJyxcblx0XHRcdHJlZDogJ2ZvbnQtcmVkJ1xuXHRcdH07XG5cdH1cblxuXHRyZW1vdmVQb3B1cChidXR0b25DbGljaywgZXZlbnQpIHtcblx0XHRjb25zdCByZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuZ290X3NhdmVfc3RhdHVzKCkpO1xuXHRcdH1cblxuXHRcdGlmIChidXR0b25DbGljay50YXJnZXQpIGV2ZW50ID0gYnV0dG9uQ2xpY2s7XG5cdFx0aWYgKGJ1dHRvbkNsaWNrID09PSB0cnVlKSB7XG5cdFx0XHRyZW1vdmUoKTtcdFx0XHRcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGV2ZW50LnRhcmdldCAmJiBldmVudC50YXJnZXQuY2xhc3NOYW1lID09PSB0aGlzLnN0eWxlcy53cmFwcGVyKSB7XG5cdFx0XHRcdHJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRcblx0cmVuZGVyKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5yZXN1bHQpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMucHJvcHMucmVzdWx0O1xuXHRcdGxldCBtZXNzYWdlID0gJyc7XG5cblx0XHRsZXQgZ2x5cGggPSAnZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUnO1xuXHRcdGxldCBjb2xvciA9IHRoaXMuc3R5bGVzLnJlZDtcblx0XHRpZiAocmVzdWx0Lm1zZyA9PT0gJ29rJykge1xuXHRcdFx0Y29sb3IgPSB0aGlzLnN0eWxlcy5ncmVlbjtcblx0XHRcdGdseXBoID0gJ2dseXBoaWNvbiBnbHlwaGljb24tb2snO1xuXHRcdFx0bWVzc2FnZSA9ICdZb3VyIEl0ZW0gQnVpbGQgaGFzIGJlZW4gc2F2ZWQuIEhlYWQgb3ZlciB0byBEb3dubG9hZCB0byBnZXQgaXQgb24geW91ciBjb21wdXRlciwgb3IgU2hhcmUgdG8gc2hvdyBvdGhlcnMgeW91ciBhbWF6aW5nIGJ1aWxkISc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lc3NhZ2UgPSAnWW91ciBJdGVtIEJ1aWxkIGlzIG1pc3Npbmcgc29tZXRoaW5nLCAobW9yZSBkZXRhaWxzIHRvIGNvbWUpJztcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9IG9uQ2xpY2s9e3RoaXMucmVtb3ZlUG9wdXAuYmluZCh0aGlzLCBmYWxzZSl9PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY29udGFpbmVyfT5cblxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY29tcG9uZW50Q29udGFpbmVyfT5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT17Y29sb3IgKyAnICcgKyB0aGlzLnN0eWxlcy5pY29ufT5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT17Z2x5cGh9Pjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5tZXNzYWdlfT5cblx0XHRcdFx0XHRcdHttZXNzYWdlfVxuXHRcdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLnJlbW92ZUJ1dHRvbn0+XG5cdFx0XHRcdFx0XHQ8YnV0dG9uIG9uQ2xpY2s9e3RoaXMucmVtb3ZlUG9wdXAuYmluZCh0aGlzLCB0cnVlKX0+R290IGl0PC9idXR0b24+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFNhdmVSZXN1bHQ7IiwiY2xhc3MgRG93bmxvYWQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ3BvcHVwLXdyYXBwZXInLFxuXHRcdFx0Y29udGFpbmVyOiAncG9wdXAtY29udGFpbmVyJyxcblxuXHRcdFx0aW5wdXRKc29uOiAnaW5wdXRKc29uJyxcblx0XHR9XG5cdH1cblxuXHRyZW1vdmVTaG93KGJ1dHRvbkNsaWNrLCBldmVudCkge1xuXHRcdGNvbnN0IHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5hcHBfaGlkZV9wb3B1cCgpKTtcblx0XHR9XG5cblx0XHRpZiAoYnV0dG9uQ2xpY2sudGFyZ2V0KSBldmVudCA9IGJ1dHRvbkNsaWNrO1xuXHRcdGlmIChidXR0b25DbGljayA9PT0gdHJ1ZSkge1xuXHRcdFx0cmVtb3ZlKCk7XHRcdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSA9PT0gdGhpcy5zdHlsZXMud3JhcHBlcikge1xuXHRcdFx0XHRyZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZW5kZXJEb3dubG9hZChqc29uKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdDxoMyBjbGFzc05hbWU9J3hmb250LXRoaW4nPkRvd25sb2FkPC9oMz5cblx0XHRcdDxociAvPlxuXHRcdFx0PHA+WW91IGNhbiBnZXQgdGhpcyBpdGVtIGJ1aWxkIHRocm91Z2ggdHdvIG1ldGhvZHMsIG9uZSBpcyBieSBkb3dubG9hZGluZyBpdCA8YSBocmVmPXsnL2Rvd25sb2FkLycgKyB0aGlzLnByb3BzLmlkICsgJy5qc29uJ30+aGVyZTwvYT4uPC9wPlxuXHRcdFx0PHA+XG5cdFx0XHRcdE9yIHRoZSBvdGhlciBtZXRob2QgaXMgY3JlYXRpbmcgYSBmaWxlIHdpdGggdGhlIG5hbWU6XG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHQ8aT57dGhpcy5wcm9wcy5pZH0uanNvbjwvaT5cblx0XHRcdDwvcD5cblx0XHRcdDxwPlxuXHRcdFx0XHRUaGVuIGNvcHkgYW5kIHBhc3RlIHRoZSBiZWxvdyBjb2RlIGludG8gdGhlIGZpbGUgYW5kIHNhdmUuXG5cdFx0XHQ8L3A+XG5cdFx0XHQ8dGV4dGFyZWEgcmVhZE9ubHkgdmFsdWU9e2pzb259IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuaW5wdXRKc29ufT48L3RleHRhcmVhPlxuXHRcdFx0PGhyIC8+XG5cdFx0XHQ8cD5cblx0XHRcdFx0QWZ0ZXIgeW91IGFyZSBkb25lIHdpdGggZWl0aGVyIG1ldGhvZCwgbW92ZSB0aGUgZmlsZSBpbnRvIHRoZSBhcHByb3ByaWF0ZSBjaGFtcGlvbiBmb2xkZXIgd2hlcmUgTGVhZ3VlIE9mIExlZ2VuZHMgaXMgaW5zdGFsbGVkLlxuXHRcdFx0PC9wPlxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxuXHRyZW5kZXJFcnIoZXJyKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHQ8aDM+VGhlcmUgd2FzIGFuIGVycm9yPC9oMz5cblx0XHRcdFx0PGhyIC8+XG5cdFx0XHRcdDxwPlRoaXMgaXMgbW9zdCBsaWtlbHkgYSBidWcuIFJlcG9ydCBpdCBpZiBwb3NzaWJsZSAoc2VlIEFib3V0IHNlY3Rpb24pLjwvcD5cblxuXHRcdFx0XHQ8cD5UaGUgc3BlY2lmaWMgZXJyb3IgbWVzc2FnZSBpczoge2Vyci50b1N0cmluZygpfTwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNob3cpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdGxldCBqc29uLCBqc29uRXJyO1xuXHRcdHRyeSB7XG5cdFx0XHRqc29uID0gSlNPTi5zdHJpbmdpZnkodGhpcy5wcm9wcy5kYXRhKTtcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdGpzb25FcnIgPSBlO1xuXHRcdH1cblxuXHRcdGxldCBtZXNzYWdlO1xuXHRcdGlmIChqc29uRXJyKSB7XG5cdFx0XHRtZXNzYWdlID0gdGhpcy5yZW5kZXJFcnIoanNvbkVycik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lc3NhZ2UgPSB0aGlzLnJlbmRlckRvd25sb2FkKGpzb24pO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9IG9uQ2xpY2s9e3RoaXMucmVtb3ZlU2hvdy5iaW5kKHRoaXMpfT5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5jb250YWluZXJ9PlxuXHRcdFx0XG5cdFx0XHRcdHttZXNzYWdlfVxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERvd25sb2FkOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNhY2hlID0ge307XG52YXIgc3RhcnQgPSAnKD86XnxcXFxccyknO1xudmFyIGVuZCA9ICcoPzpcXFxcc3wkKSc7XG5cbmZ1bmN0aW9uIGxvb2t1cENsYXNzIChjbGFzc05hbWUpIHtcbiAgdmFyIGNhY2hlZCA9IGNhY2hlW2NsYXNzTmFtZV07XG4gIGlmIChjYWNoZWQpIHtcbiAgICBjYWNoZWQubGFzdEluZGV4ID0gMDtcbiAgfSBlbHNlIHtcbiAgICBjYWNoZVtjbGFzc05hbWVdID0gY2FjaGVkID0gbmV3IFJlZ0V4cChzdGFydCArIGNsYXNzTmFtZSArIGVuZCwgJ2cnKTtcbiAgfVxuICByZXR1cm4gY2FjaGVkO1xufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyAoZWwsIGNsYXNzTmFtZSkge1xuICB2YXIgY3VycmVudCA9IGVsLmNsYXNzTmFtZTtcbiAgaWYgKCFjdXJyZW50Lmxlbmd0aCkge1xuICAgIGVsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgfSBlbHNlIGlmICghbG9va3VwQ2xhc3MoY2xhc3NOYW1lKS50ZXN0KGN1cnJlbnQpKSB7XG4gICAgZWwuY2xhc3NOYW1lICs9ICcgJyArIGNsYXNzTmFtZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBybUNsYXNzIChlbCwgY2xhc3NOYW1lKSB7XG4gIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKGxvb2t1cENsYXNzKGNsYXNzTmFtZSksICcgJykudHJpbSgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRDbGFzcyxcbiAgcm06IHJtQ2xhc3Ncbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICBNb2RpZmllZCBMIzM2NywgaHR0cHM6Ly9naXRodWIuY29tL2JldmFjcXVhL2RyYWd1bGFcbiAqL1xuXG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2NvbnRyYS9lbWl0dGVyJyk7XG52YXIgY3Jvc3N2ZW50ID0gcmVxdWlyZSgnY3Jvc3N2ZW50Jyk7XG52YXIgY2xhc3NlcyA9IHJlcXVpcmUoJy4vY2xhc3NlcycpO1xuXG5mdW5jdGlvbiBkcmFndWxhIChpbml0aWFsQ29udGFpbmVycywgb3B0aW9ucykge1xuICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgaWYgKGxlbiA9PT0gMSAmJiBBcnJheS5pc0FycmF5KGluaXRpYWxDb250YWluZXJzKSA9PT0gZmFsc2UpIHtcbiAgICBvcHRpb25zID0gaW5pdGlhbENvbnRhaW5lcnM7XG4gICAgaW5pdGlhbENvbnRhaW5lcnMgPSBbXTtcbiAgfVxuICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIHZhciBkb2N1bWVudEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHZhciBfbWlycm9yOyAvLyBtaXJyb3IgaW1hZ2VcbiAgdmFyIF9zb3VyY2U7IC8vIHNvdXJjZSBjb250YWluZXJcbiAgdmFyIF9pdGVtOyAvLyBpdGVtIGJlaW5nIGRyYWdnZWRcbiAgdmFyIF9vZmZzZXRYOyAvLyByZWZlcmVuY2UgeFxuICB2YXIgX29mZnNldFk7IC8vIHJlZmVyZW5jZSB5XG4gIHZhciBfaW5pdGlhbFNpYmxpbmc7IC8vIHJlZmVyZW5jZSBzaWJsaW5nIHdoZW4gZ3JhYmJlZFxuICB2YXIgX2N1cnJlbnRTaWJsaW5nOyAvLyByZWZlcmVuY2Ugc2libGluZyBub3dcbiAgdmFyIF9jb3B5OyAvLyBpdGVtIHVzZWQgZm9yIGNvcHlpbmdcbiAgdmFyIF9yZW5kZXJUaW1lcjsgLy8gdGltZXIgZm9yIHNldFRpbWVvdXQgcmVuZGVyTWlycm9ySW1hZ2VcbiAgdmFyIF9sYXN0RHJvcFRhcmdldCA9IG51bGw7IC8vIGxhc3QgY29udGFpbmVyIGl0ZW0gd2FzIG92ZXJcbiAgdmFyIF9ncmFiYmVkOyAvLyBob2xkcyBtb3VzZWRvd24gY29udGV4dCB1bnRpbCBmaXJzdCBtb3VzZW1vdmVcblxuICB2YXIgbyA9IG9wdGlvbnMgfHwge307XG4gIGlmIChvLm1vdmVzID09PSB2b2lkIDApIHsgby5tb3ZlcyA9IGFsd2F5czsgfVxuICBpZiAoby5hY2NlcHRzID09PSB2b2lkIDApIHsgby5hY2NlcHRzID0gYWx3YXlzOyB9XG4gIGlmIChvLmludmFsaWQgPT09IHZvaWQgMCkgeyBvLmludmFsaWQgPSBpbnZhbGlkVGFyZ2V0OyB9XG4gIGlmIChvLmNvbnRhaW5lcnMgPT09IHZvaWQgMCkgeyBvLmNvbnRhaW5lcnMgPSBpbml0aWFsQ29udGFpbmVycyB8fCBbXTsgfVxuICBpZiAoby5pc0NvbnRhaW5lciA9PT0gdm9pZCAwKSB7IG8uaXNDb250YWluZXIgPSBuZXZlcjsgfVxuICBpZiAoby5jb3B5ID09PSB2b2lkIDApIHsgby5jb3B5ID0gZmFsc2U7IH1cbiAgaWYgKG8ucmV2ZXJ0T25TcGlsbCA9PT0gdm9pZCAwKSB7IG8ucmV2ZXJ0T25TcGlsbCA9IGZhbHNlOyB9XG4gIGlmIChvLnJlbW92ZU9uU3BpbGwgPT09IHZvaWQgMCkgeyBvLnJlbW92ZU9uU3BpbGwgPSBmYWxzZTsgfVxuICBpZiAoby5kaXJlY3Rpb24gPT09IHZvaWQgMCkgeyBvLmRpcmVjdGlvbiA9ICd2ZXJ0aWNhbCc7IH1cbiAgaWYgKG8ubWlycm9yQ29udGFpbmVyID09PSB2b2lkIDApIHsgby5taXJyb3JDb250YWluZXIgPSBib2R5OyB9XG5cbiAgdmFyIGRyYWtlID0gZW1pdHRlcih7XG4gICAgY29udGFpbmVyczogby5jb250YWluZXJzLFxuICAgIHN0YXJ0OiBtYW51YWxTdGFydCxcbiAgICBlbmQ6IGVuZCxcbiAgICBjYW5jZWw6IGNhbmNlbCxcbiAgICByZW1vdmU6IHJlbW92ZSxcbiAgICBkZXN0cm95OiBkZXN0cm95LFxuICAgIGRyYWdnaW5nOiBmYWxzZVxuICB9KTtcblxuICBpZiAoby5yZW1vdmVPblNwaWxsID09PSB0cnVlKSB7XG4gICAgZHJha2Uub24oJ292ZXInLCBzcGlsbE92ZXIpLm9uKCdvdXQnLCBzcGlsbE91dCk7XG4gIH1cblxuICBldmVudHMoKTtcblxuICByZXR1cm4gZHJha2U7XG5cbiAgZnVuY3Rpb24gaXNDb250YWluZXIgKGVsKSB7XG4gICAgcmV0dXJuIGRyYWtlLmNvbnRhaW5lcnMuaW5kZXhPZihlbCkgIT09IC0xIHx8IG8uaXNDb250YWluZXIoZWwpO1xuICB9XG5cbiAgZnVuY3Rpb24gZXZlbnRzIChyZW1vdmUpIHtcbiAgICB2YXIgb3AgPSByZW1vdmUgPyAncmVtb3ZlJyA6ICdhZGQnO1xuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsIG9wLCAnbW91c2Vkb3duJywgZ3JhYik7XG4gICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgb3AsICdtb3VzZXVwJywgcmVsZWFzZSk7XG4gIH1cblxuICBmdW5jdGlvbiBldmVudHVhbE1vdmVtZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ21vdXNlbW92ZScsIHN0YXJ0QmVjYXVzZU1vdXNlTW92ZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gbW92ZW1lbnRzIChyZW1vdmUpIHtcbiAgICB2YXIgb3AgPSByZW1vdmUgPyAncmVtb3ZlJyA6ICdhZGQnO1xuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsIG9wLCAnc2VsZWN0c3RhcnQnLCBwcmV2ZW50R3JhYmJlZCk7IC8vIElFOFxuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsIG9wLCAnY2xpY2snLCBwcmV2ZW50R3JhYmJlZCk7XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95ICgpIHtcbiAgICBldmVudHModHJ1ZSk7XG4gICAgcmVsZWFzZSh7fSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmV2ZW50R3JhYmJlZCAoZSkge1xuICAgIGlmIChfZ3JhYmJlZCkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdyYWIgKGUpIHtcbiAgICB2YXIgaWdub3JlID0gKGUud2hpY2ggIT09IDAgJiYgZS53aGljaCAhPT0gMSkgfHwgZS5tZXRhS2V5IHx8IGUuY3RybEtleTtcbiAgICBpZiAoaWdub3JlKSB7XG4gICAgICByZXR1cm47IC8vIHdlIG9ubHkgY2FyZSBhYm91dCBob25lc3QtdG8tZ29kIGxlZnQgY2xpY2tzIGFuZCB0b3VjaCBldmVudHNcbiAgICB9XG4gICAgdmFyIGl0ZW0gPSBlLnRhcmdldDtcbiAgICB2YXIgY29udGV4dCA9IGNhblN0YXJ0KGl0ZW0pO1xuICAgIGlmICghY29udGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfZ3JhYmJlZCA9IGNvbnRleHQ7XG4gICAgZXZlbnR1YWxNb3ZlbWVudHMoKTtcbiAgICBpZiAoZS50eXBlID09PSAnbW91c2Vkb3duJykge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyAvLyBmaXhlcyBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMTU1XG4gICAgICBpZiAoaXRlbS50YWdOYW1lID09PSAnSU5QVVQnIHx8IGl0ZW0udGFnTmFtZSA9PT0gJ1RFWFRBUkVBJykge1xuICAgICAgICBpdGVtLmZvY3VzKCk7IC8vIGZpeGVzIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXZhY3F1YS9kcmFndWxhL2lzc3Vlcy8xNzZcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydEJlY2F1c2VNb3VzZU1vdmVkIChlKSB7XG4gICAgZXZlbnR1YWxNb3ZlbWVudHModHJ1ZSk7XG4gICAgbW92ZW1lbnRzKCk7XG4gICAgZW5kKCk7XG4gICAgc3RhcnQoX2dyYWJiZWQpO1xuXG4gICAgdmFyIG9mZnNldCA9IGdldE9mZnNldChfaXRlbSk7XG4gICAgX29mZnNldFggPSBnZXRDb29yZCgncGFnZVgnLCBlKSAtIG9mZnNldC5sZWZ0O1xuICAgIF9vZmZzZXRZID0gZ2V0Q29vcmQoJ3BhZ2VZJywgZSkgLSBvZmZzZXQudG9wO1xuXG4gICAgY2xhc3Nlcy5hZGQoX2NvcHkgfHwgX2l0ZW0sICdndS10cmFuc2l0Jyk7XG4gICAgcmVuZGVyTWlycm9ySW1hZ2UoKTtcbiAgICBkcmFnKGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuU3RhcnQgKGl0ZW0pIHtcbiAgICBpZiAoZHJha2UuZHJhZ2dpbmcgJiYgX21pcnJvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaXNDb250YWluZXIoaXRlbSkpIHtcbiAgICAgIHJldHVybjsgLy8gZG9uJ3QgZHJhZyBjb250YWluZXIgaXRzZWxmXG4gICAgfVxuICAgIHZhciBoYW5kbGUgPSBpdGVtO1xuICAgIHdoaWxlIChpdGVtLnBhcmVudEVsZW1lbnQgJiYgaXNDb250YWluZXIoaXRlbS5wYXJlbnRFbGVtZW50KSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChvLmludmFsaWQoaXRlbSwgaGFuZGxlKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpdGVtID0gaXRlbS5wYXJlbnRFbGVtZW50OyAvLyBkcmFnIHRhcmdldCBzaG91bGQgYmUgYSB0b3AgZWxlbWVudFxuICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIHNvdXJjZSA9IGl0ZW0ucGFyZW50RWxlbWVudDtcbiAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoby5pbnZhbGlkKGl0ZW0sIGhhbmRsZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbW92YWJsZSA9IG8ubW92ZXMoaXRlbSwgc291cmNlLCBoYW5kbGUpO1xuICAgIGlmICghbW92YWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpdGVtOiBpdGVtLFxuICAgICAgc291cmNlOiBzb3VyY2VcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbWFudWFsU3RhcnQgKGl0ZW0pIHtcbiAgICB2YXIgY29udGV4dCA9IGNhblN0YXJ0KGl0ZW0pO1xuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBzdGFydChjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydCAoY29udGV4dCkge1xuICAgIGlmIChvLmNvcHkpIHtcbiAgICAgIF9jb3B5ID0gY29udGV4dC5pdGVtLmNsb25lTm9kZSh0cnVlKTtcbiAgICAgIGRyYWtlLmVtaXQoJ2Nsb25lZCcsIF9jb3B5LCBjb250ZXh0Lml0ZW0sICdjb3B5Jyk7XG4gICAgfVxuXG4gICAgX3NvdXJjZSA9IGNvbnRleHQuc291cmNlO1xuICAgIF9pdGVtID0gY29udGV4dC5pdGVtO1xuICAgIF9pbml0aWFsU2libGluZyA9IF9jdXJyZW50U2libGluZyA9IG5leHRFbChjb250ZXh0Lml0ZW0pO1xuXG4gICAgZHJha2UuZHJhZ2dpbmcgPSB0cnVlO1xuICAgIGRyYWtlLmVtaXQoJ2RyYWcnLCBfaXRlbSwgX3NvdXJjZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpbnZhbGlkVGFyZ2V0ICgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBlbmQgKCkge1xuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICBkcm9wKGl0ZW0sIGl0ZW0ucGFyZW50RWxlbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiB1bmdyYWIgKCkge1xuICAgIF9ncmFiYmVkID0gZmFsc2U7XG4gICAgZXZlbnR1YWxNb3ZlbWVudHModHJ1ZSk7XG4gICAgbW92ZW1lbnRzKHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVsZWFzZSAoZSkge1xuICAgIHVuZ3JhYigpO1xuXG4gICAgaWYgKCFkcmFrZS5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBjbGllbnRYID0gZ2V0Q29vcmQoJ2NsaWVudFgnLCBlKTtcbiAgICB2YXIgY2xpZW50WSA9IGdldENvb3JkKCdjbGllbnRZJywgZSk7XG4gICAgdmFyIGVsZW1lbnRCZWhpbmRDdXJzb3IgPSBnZXRFbGVtZW50QmVoaW5kUG9pbnQoX21pcnJvciwgY2xpZW50WCwgY2xpZW50WSk7XG4gICAgdmFyIGRyb3BUYXJnZXQgPSBmaW5kRHJvcFRhcmdldChlbGVtZW50QmVoaW5kQ3Vyc29yLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICBpZiAoZHJvcFRhcmdldCAmJiAoby5jb3B5ID09PSBmYWxzZSB8fCBkcm9wVGFyZ2V0ICE9PSBfc291cmNlKSkge1xuICAgICAgZHJvcChpdGVtLCBkcm9wVGFyZ2V0KTtcbiAgICB9IGVsc2UgaWYgKG8ucmVtb3ZlT25TcGlsbCkge1xuICAgICAgcmVtb3ZlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbmNlbCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRyb3AgKGl0ZW0sIHRhcmdldCkge1xuICAgIGlmIChpc0luaXRpYWxQbGFjZW1lbnQodGFyZ2V0KSkge1xuICAgICAgZHJha2UuZW1pdCgnY2FuY2VsJywgaXRlbSwgX3NvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRyYWtlLmVtaXQoJ2Ryb3AnLCBpdGVtLCB0YXJnZXQsIF9zb3VyY2UpO1xuICAgIH1cbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUgKCkge1xuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICB2YXIgcGFyZW50ID0gaXRlbS5wYXJlbnRFbGVtZW50O1xuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChpdGVtKTtcbiAgICB9XG4gICAgZHJha2UuZW1pdChvLmNvcHkgPyAnY2FuY2VsJyA6ICdyZW1vdmUnLCBpdGVtLCBwYXJlbnQpO1xuICAgIGNsZWFudXAoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbmNlbCAocmV2ZXJ0KSB7XG4gICAgaWYgKCFkcmFrZS5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmV2ZXJ0cyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwID8gcmV2ZXJ0IDogby5yZXZlcnRPblNwaWxsO1xuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgdmFyIHBhcmVudCA9IGl0ZW0ucGFyZW50RWxlbWVudDtcbiAgICBpZiAocGFyZW50ID09PSBfc291cmNlICYmIG8uY29weSkge1xuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKF9jb3B5KTtcbiAgICB9XG4gICAgdmFyIGluaXRpYWwgPSBpc0luaXRpYWxQbGFjZW1lbnQocGFyZW50KTtcbiAgICBpZiAoaW5pdGlhbCA9PT0gZmFsc2UgJiYgby5jb3B5ID09PSBmYWxzZSAmJiByZXZlcnRzKSB7XG4gICAgICBfc291cmNlLmluc2VydEJlZm9yZShpdGVtLCBfaW5pdGlhbFNpYmxpbmcpO1xuICAgIH1cbiAgICBpZiAoaW5pdGlhbCB8fCByZXZlcnRzKSB7XG4gICAgICBkcmFrZS5lbWl0KCdjYW5jZWwnLCBpdGVtLCBfc291cmNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZHJha2UuZW1pdCgnZHJvcCcsIGl0ZW0sIHBhcmVudCwgX3NvdXJjZSk7XG4gICAgfVxuICAgIGNsZWFudXAoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFudXAgKCkge1xuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgdW5ncmFiKCk7XG4gICAgcmVtb3ZlTWlycm9ySW1hZ2UoKTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgY2xhc3Nlcy5ybShpdGVtLCAnZ3UtdHJhbnNpdCcpO1xuICAgIH1cbiAgICBpZiAoX3JlbmRlclRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQoX3JlbmRlclRpbWVyKTtcbiAgICB9XG4gICAgZHJha2UuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICBkcmFrZS5lbWl0KCdvdXQnLCBpdGVtLCBfbGFzdERyb3BUYXJnZXQsIF9zb3VyY2UpO1xuICAgIGRyYWtlLmVtaXQoJ2RyYWdlbmQnLCBpdGVtKTtcbiAgICBfc291cmNlID0gX2l0ZW0gPSBfY29weSA9IF9pbml0aWFsU2libGluZyA9IF9jdXJyZW50U2libGluZyA9IF9yZW5kZXJUaW1lciA9IF9sYXN0RHJvcFRhcmdldCA9IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBpc0luaXRpYWxQbGFjZW1lbnQgKHRhcmdldCwgcykge1xuICAgIHZhciBzaWJsaW5nO1xuICAgIGlmIChzICE9PSB2b2lkIDApIHtcbiAgICAgIHNpYmxpbmcgPSBzO1xuICAgIH0gZWxzZSBpZiAoX21pcnJvcikge1xuICAgICAgc2libGluZyA9IF9jdXJyZW50U2libGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgc2libGluZyA9IG5leHRFbChfY29weSB8fCBfaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQgPT09IF9zb3VyY2UgJiYgc2libGluZyA9PT0gX2luaXRpYWxTaWJsaW5nO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZERyb3BUYXJnZXQgKGVsZW1lbnRCZWhpbmRDdXJzb3IsIGNsaWVudFgsIGNsaWVudFkpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZWxlbWVudEJlaGluZEN1cnNvcjtcbiAgICB3aGlsZSAodGFyZ2V0ICYmICFhY2NlcHRlZCgpKSB7XG4gICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50RWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcblxuICAgIGZ1bmN0aW9uIGFjY2VwdGVkICgpIHtcbiAgICAgIHZhciBkcm9wcGFibGUgPSBpc0NvbnRhaW5lcih0YXJnZXQpO1xuICAgICAgaWYgKGRyb3BwYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgaW1tZWRpYXRlID0gZ2V0SW1tZWRpYXRlQ2hpbGQodGFyZ2V0LCBlbGVtZW50QmVoaW5kQ3Vyc29yKTtcbiAgICAgIHZhciByZWZlcmVuY2UgPSBnZXRSZWZlcmVuY2UodGFyZ2V0LCBpbW1lZGlhdGUsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgICAgdmFyIGluaXRpYWwgPSBpc0luaXRpYWxQbGFjZW1lbnQodGFyZ2V0LCByZWZlcmVuY2UpO1xuICAgICAgaWYgKGluaXRpYWwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIHNob3VsZCBhbHdheXMgYmUgYWJsZSB0byBkcm9wIGl0IHJpZ2h0IGJhY2sgd2hlcmUgaXQgd2FzXG4gICAgICB9XG4gICAgICByZXR1cm4gby5hY2NlcHRzKF9pdGVtLCB0YXJnZXQsIF9zb3VyY2UsIHJlZmVyZW5jZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZHJhZyAoZSkge1xuICAgIGlmICghX21pcnJvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB2YXIgY2xpZW50WCA9IGdldENvb3JkKCdjbGllbnRYJywgZSk7XG4gICAgdmFyIGNsaWVudFkgPSBnZXRDb29yZCgnY2xpZW50WScsIGUpO1xuICAgIHZhciB4ID0gY2xpZW50WCAtIF9vZmZzZXRYO1xuICAgIHZhciB5ID0gY2xpZW50WSAtIF9vZmZzZXRZO1xuXG4gICAgX21pcnJvci5zdHlsZS5sZWZ0ID0geCArICdweCc7XG4gICAgX21pcnJvci5zdHlsZS50b3AgID0geSArICdweCc7XG5cbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBlbGVtZW50QmVoaW5kQ3Vyc29yID0gZ2V0RWxlbWVudEJlaGluZFBvaW50KF9taXJyb3IsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIHZhciBkcm9wVGFyZ2V0ID0gZmluZERyb3BUYXJnZXQoZWxlbWVudEJlaGluZEN1cnNvciwgY2xpZW50WCwgY2xpZW50WSk7XG4gICAgdmFyIGNoYW5nZWQgPSBkcm9wVGFyZ2V0ICE9PSBudWxsICYmIGRyb3BUYXJnZXQgIT09IF9sYXN0RHJvcFRhcmdldDtcbiAgICBpZiAoY2hhbmdlZCB8fCBkcm9wVGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICBvdXQoKTtcbiAgICAgIF9sYXN0RHJvcFRhcmdldCA9IGRyb3BUYXJnZXQ7XG4gICAgICBvdmVyKCk7XG4gICAgfVxuICAgIGlmIChkcm9wVGFyZ2V0ID09PSBfc291cmNlICYmIG8uY29weSkge1xuICAgICAgaWYgKGl0ZW0ucGFyZW50RWxlbWVudCkge1xuICAgICAgICBpdGVtLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciByZWZlcmVuY2U7XG4gICAgdmFyIGltbWVkaWF0ZSA9IGdldEltbWVkaWF0ZUNoaWxkKGRyb3BUYXJnZXQsIGVsZW1lbnRCZWhpbmRDdXJzb3IpO1xuICAgIGlmIChpbW1lZGlhdGUgIT09IG51bGwpIHtcbiAgICAgIHJlZmVyZW5jZSA9IGdldFJlZmVyZW5jZShkcm9wVGFyZ2V0LCBpbW1lZGlhdGUsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIH0gZWxzZSBpZiAoby5yZXZlcnRPblNwaWxsID09PSB0cnVlICYmICFvLmNvcHkpIHtcbiAgICAgIHJlZmVyZW5jZSA9IF9pbml0aWFsU2libGluZztcbiAgICAgIGRyb3BUYXJnZXQgPSBfc291cmNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoby5jb3B5ICYmIGl0ZW0ucGFyZW50RWxlbWVudCkge1xuICAgICAgICBpdGVtLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChcbiAgICAgIHJlZmVyZW5jZSA9PT0gbnVsbCB8fFxuICAgICAgcmVmZXJlbmNlICE9PSBpdGVtICYmXG4gICAgICByZWZlcmVuY2UgIT09IG5leHRFbChpdGVtKSAmJlxuICAgICAgcmVmZXJlbmNlICE9PSBfY3VycmVudFNpYmxpbmdcbiAgICApIHtcbiAgICAgIF9jdXJyZW50U2libGluZyA9IHJlZmVyZW5jZTtcbiAgICAgIC8vZHJvcFRhcmdldC5pbnNlcnRCZWZvcmUoaXRlbSwgcmVmZXJlbmNlKTtcbiAgICAgIGRyYWtlLmVtaXQoJ3NoYWRvdycsIGl0ZW0sIGRyb3BUYXJnZXQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBtb3ZlZCAodHlwZSkgeyBkcmFrZS5lbWl0KHR5cGUsIGl0ZW0sIF9sYXN0RHJvcFRhcmdldCwgX3NvdXJjZSk7IH1cbiAgICBmdW5jdGlvbiBvdmVyICgpIHsgaWYgKGNoYW5nZWQpIHsgbW92ZWQoJ292ZXInKTsgfSB9XG4gICAgZnVuY3Rpb24gb3V0ICgpIHsgaWYgKF9sYXN0RHJvcFRhcmdldCkgeyBtb3ZlZCgnb3V0Jyk7IH0gfVxuICB9XG5cbiAgZnVuY3Rpb24gc3BpbGxPdmVyIChlbCkge1xuICAgIGNsYXNzZXMucm0oZWwsICdndS1oaWRlJyk7XG4gIH1cblxuICBmdW5jdGlvbiBzcGlsbE91dCAoZWwpIHtcbiAgICBpZiAoZHJha2UuZHJhZ2dpbmcpIHsgY2xhc3Nlcy5hZGQoZWwsICdndS1oaWRlJyk7IH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlck1pcnJvckltYWdlICgpIHtcbiAgICBpZiAoX21pcnJvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVjdCA9IF9pdGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIF9taXJyb3IgPSBfaXRlbS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgX21pcnJvci5zdHlsZS53aWR0aCA9IGdldFJlY3RXaWR0aChyZWN0KSArICdweCc7XG4gICAgX21pcnJvci5zdHlsZS5oZWlnaHQgPSBnZXRSZWN0SGVpZ2h0KHJlY3QpICsgJ3B4JztcbiAgICBjbGFzc2VzLnJtKF9taXJyb3IsICdndS10cmFuc2l0Jyk7XG4gICAgY2xhc3Nlcy5hZGQoX21pcnJvciwgJ2d1LW1pcnJvcicpO1xuICAgIG8ubWlycm9yQ29udGFpbmVyLmFwcGVuZENoaWxkKF9taXJyb3IpO1xuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsICdhZGQnLCAnbW91c2Vtb3ZlJywgZHJhZyk7XG4gICAgY2xhc3Nlcy5hZGQoby5taXJyb3JDb250YWluZXIsICdndS11bnNlbGVjdGFibGUnKTtcbiAgICBkcmFrZS5lbWl0KCdjbG9uZWQnLCBfbWlycm9yLCBfaXRlbSwgJ21pcnJvcicpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTWlycm9ySW1hZ2UgKCkge1xuICAgIGlmIChfbWlycm9yKSB7XG4gICAgICBjbGFzc2VzLnJtKG8ubWlycm9yQ29udGFpbmVyLCAnZ3UtdW5zZWxlY3RhYmxlJyk7XG4gICAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCAncmVtb3ZlJywgJ21vdXNlbW92ZScsIGRyYWcpO1xuICAgICAgX21pcnJvci5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKF9taXJyb3IpO1xuICAgICAgX21pcnJvciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SW1tZWRpYXRlQ2hpbGQgKGRyb3BUYXJnZXQsIHRhcmdldCkge1xuICAgIHZhciBpbW1lZGlhdGUgPSB0YXJnZXQ7XG4gICAgd2hpbGUgKGltbWVkaWF0ZSAhPT0gZHJvcFRhcmdldCAmJiBpbW1lZGlhdGUucGFyZW50RWxlbWVudCAhPT0gZHJvcFRhcmdldCkge1xuICAgICAgaW1tZWRpYXRlID0gaW1tZWRpYXRlLnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuICAgIGlmIChpbW1lZGlhdGUgPT09IGRvY3VtZW50RWxlbWVudCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBpbW1lZGlhdGU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSZWZlcmVuY2UgKGRyb3BUYXJnZXQsIHRhcmdldCwgeCwgeSkge1xuICAgIHZhciBob3Jpem9udGFsID0gby5kaXJlY3Rpb24gPT09ICdob3Jpem9udGFsJztcbiAgICB2YXIgcmVmZXJlbmNlID0gdGFyZ2V0ICE9PSBkcm9wVGFyZ2V0ID8gaW5zaWRlKCkgOiBvdXRzaWRlKCk7XG4gICAgcmV0dXJuIHJlZmVyZW5jZTtcblxuICAgIGZ1bmN0aW9uIG91dHNpZGUgKCkgeyAvLyBzbG93ZXIsIGJ1dCBhYmxlIHRvIGZpZ3VyZSBvdXQgYW55IHBvc2l0aW9uXG4gICAgICB2YXIgbGVuID0gZHJvcFRhcmdldC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgICB2YXIgaTtcbiAgICAgIHZhciBlbDtcbiAgICAgIHZhciByZWN0O1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGVsID0gZHJvcFRhcmdldC5jaGlsZHJlbltpXTtcbiAgICAgICAgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICBpZiAoaG9yaXpvbnRhbCAmJiByZWN0LmxlZnQgPiB4KSB7IHJldHVybiBlbDsgfVxuICAgICAgICBpZiAoIWhvcml6b250YWwgJiYgcmVjdC50b3AgPiB5KSB7IHJldHVybiBlbDsgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zaWRlICgpIHsgLy8gZmFzdGVyLCBidXQgb25seSBhdmFpbGFibGUgaWYgZHJvcHBlZCBpbnNpZGUgYSBjaGlsZCBlbGVtZW50XG4gICAgICB2YXIgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGlmIChob3Jpem9udGFsKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlKHggPiByZWN0LmxlZnQgKyBnZXRSZWN0V2lkdGgocmVjdCkgLyAyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvbHZlKHkgPiByZWN0LnRvcCArIGdldFJlY3RIZWlnaHQocmVjdCkgLyAyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlIChhZnRlcikge1xuICAgICAgcmV0dXJuIGFmdGVyID8gbmV4dEVsKHRhcmdldCkgOiB0YXJnZXQ7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHRvdWNoeSAoZWwsIG9wLCB0eXBlLCBmbikge1xuICB2YXIgdG91Y2ggPSB7XG4gICAgbW91c2V1cDogJ3RvdWNoZW5kJyxcbiAgICBtb3VzZWRvd246ICd0b3VjaHN0YXJ0JyxcbiAgICBtb3VzZW1vdmU6ICd0b3VjaG1vdmUnXG4gIH07XG4gIHZhciBtaWNyb3NvZnQgPSB7XG4gICAgbW91c2V1cDogJ01TUG9pbnRlclVwJyxcbiAgICBtb3VzZWRvd246ICdNU1BvaW50ZXJEb3duJyxcbiAgICBtb3VzZW1vdmU6ICdNU1BvaW50ZXJNb3ZlJ1xuICB9O1xuICBpZiAoZ2xvYmFsLm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkKSB7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgbWljcm9zb2Z0W3R5cGVdLCBmbik7XG4gIH1cbiAgY3Jvc3N2ZW50W29wXShlbCwgdG91Y2hbdHlwZV0sIGZuKTtcbiAgY3Jvc3N2ZW50W29wXShlbCwgdHlwZSwgZm4pO1xufVxuXG5mdW5jdGlvbiBnZXRPZmZzZXQgKGVsKSB7XG4gIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHJldHVybiB7XG4gICAgbGVmdDogcmVjdC5sZWZ0ICsgZ2V0U2Nyb2xsKCdzY3JvbGxMZWZ0JywgJ3BhZ2VYT2Zmc2V0JyksXG4gICAgdG9wOiByZWN0LnRvcCArIGdldFNjcm9sbCgnc2Nyb2xsVG9wJywgJ3BhZ2VZT2Zmc2V0JylcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Nyb2xsIChzY3JvbGxQcm9wLCBvZmZzZXRQcm9wKSB7XG4gIGlmICh0eXBlb2YgZ2xvYmFsW29mZnNldFByb3BdICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBnbG9iYWxbb2Zmc2V0UHJvcF07XG4gIH1cbiAgdmFyIGRvY3VtZW50RWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgaWYgKGRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRFbGVtZW50W3Njcm9sbFByb3BdO1xuICB9XG4gIHZhciBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgcmV0dXJuIGJvZHlbc2Nyb2xsUHJvcF07XG59XG5cbmZ1bmN0aW9uIGdldEVsZW1lbnRCZWhpbmRQb2ludCAocG9pbnQsIHgsIHkpIHtcbiAgdmFyIHAgPSBwb2ludCB8fCB7fTtcbiAgdmFyIHN0YXRlID0gcC5jbGFzc05hbWU7XG4gIHZhciBlbDtcbiAgcC5jbGFzc05hbWUgKz0gJyBndS1oaWRlJztcbiAgZWwgPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KHgsIHkpO1xuICBwLmNsYXNzTmFtZSA9IHN0YXRlO1xuICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIG5ldmVyICgpIHsgcmV0dXJuIGZhbHNlOyB9XG5mdW5jdGlvbiBhbHdheXMgKCkgeyByZXR1cm4gdHJ1ZTsgfVxuXG5mdW5jdGlvbiBuZXh0RWwgKGVsKSB7XG4gIHJldHVybiBlbC5uZXh0RWxlbWVudFNpYmxpbmcgfHwgbWFudWFsbHkoKTtcbiAgZnVuY3Rpb24gbWFudWFsbHkgKCkge1xuICAgIHZhciBzaWJsaW5nID0gZWw7XG4gICAgZG8ge1xuICAgICAgc2libGluZyA9IHNpYmxpbmcubmV4dFNpYmxpbmc7XG4gICAgfSB3aGlsZSAoc2libGluZyAmJiBzaWJsaW5nLm5vZGVUeXBlICE9PSAxKTtcbiAgICByZXR1cm4gc2libGluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRFdmVudEhvc3QgKGUpIHtcbiAgLy8gb24gdG91Y2hlbmQgZXZlbnQsIHdlIGhhdmUgdG8gdXNlIGBlLmNoYW5nZWRUb3VjaGVzYFxuICAvLyBzZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83MTkyNTYzL3RvdWNoZW5kLWV2ZW50LXByb3BlcnRpZXNcbiAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXZhY3F1YS9kcmFndWxhL2lzc3Vlcy8zNFxuICBpZiAoZS50YXJnZXRUb3VjaGVzICYmIGUudGFyZ2V0VG91Y2hlcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gZS50YXJnZXRUb3VjaGVzWzBdO1xuICB9XG4gIGlmIChlLmNoYW5nZWRUb3VjaGVzICYmIGUuY2hhbmdlZFRvdWNoZXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGUuY2hhbmdlZFRvdWNoZXNbMF07XG4gIH1cbiAgcmV0dXJuIGU7XG59XG5cbmZ1bmN0aW9uIGdldENvb3JkIChjb29yZCwgZSkge1xuICB2YXIgaG9zdCA9IGdldEV2ZW50SG9zdChlKTtcbiAgdmFyIG1pc3NNYXAgPSB7XG4gICAgcGFnZVg6ICdjbGllbnRYJywgLy8gSUU4XG4gICAgcGFnZVk6ICdjbGllbnRZJyAvLyBJRThcbiAgfTtcbiAgaWYgKGNvb3JkIGluIG1pc3NNYXAgJiYgIShjb29yZCBpbiBob3N0KSAmJiBtaXNzTWFwW2Nvb3JkXSBpbiBob3N0KSB7XG4gICAgY29vcmQgPSBtaXNzTWFwW2Nvb3JkXTtcbiAgfVxuICByZXR1cm4gaG9zdFtjb29yZF07XG59XG5cbmZ1bmN0aW9uIGdldFJlY3RXaWR0aCAocmVjdCkge1xuICByZXR1cm4gcmVjdC53aWR0aCB8fCAocmVjdC5yaWdodCAtIHJlY3QubGVmdCk7XG59XG5cbmZ1bmN0aW9uIGdldFJlY3RIZWlnaHQgKHJlY3QpIHtcbiAgcmV0dXJuIHJlY3QuaGVpZ2h0IHx8IChyZWN0LmJvdHRvbSAtIHJlY3QudG9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkcmFndWxhO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZHJhZ3VsYSA9IHJlcXVpcmUoJy4vZHJhZ3VsYScpO1xudmFyIGF0b2EgPSByZXF1aXJlKCdhdG9hJyk7XG5cbmZ1bmN0aW9uIHJlYWN0RHJhZ3VsYSAoKSB7XG4gIHJldHVybiBkcmFndWxhLmFwcGx5KHRoaXMsIGF0b2EoYXJndW1lbnRzKSkub24oJ2Nsb25lZCcsIGNsb25lZCk7XG5cbiAgZnVuY3Rpb24gY2xvbmVkIChjbG9uZSkge1xuICAgIHJtKGNsb25lKTtcbiAgICBhdG9hKGNsb25lLmdldEVsZW1lbnRzQnlUYWdOYW1lKCcqJykpLmZvckVhY2gocm0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcm0gKGVsKSB7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXJlYWN0aWQnKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlYWN0RHJhZ3VsYTsiLCJjbGFzcyBJbmZvIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdwb3B1cC13cmFwcGVyJyxcblx0XHRcdGNvbnRhaW5lcjogJ3BvcHVwLWNvbnRhaW5lcicsXG5cblx0XHR9XG5cdH1cblxuXHRyZW1vdmVTaG93KGJ1dHRvbkNsaWNrLCBldmVudCkge1xuXHRcdGNvbnN0IHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5hcHBfaGlkZV9wb3B1cCgpKTtcblx0XHR9XG5cblx0XHRpZiAoYnV0dG9uQ2xpY2sudGFyZ2V0KSBldmVudCA9IGJ1dHRvbkNsaWNrO1xuXHRcdGlmIChidXR0b25DbGljayA9PT0gdHJ1ZSkge1xuXHRcdFx0cmVtb3ZlKCk7XHRcdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSA9PT0gdGhpcy5zdHlsZXMud3JhcHBlcikge1xuXHRcdFx0XHRyZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNob3cpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9IG9uQ2xpY2s9e3RoaXMucmVtb3ZlU2hvdy5iaW5kKHRoaXMpfT5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5jb250YWluZXJ9PlxuXHRcdFx0XG5cdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0PGgzPkl0ZW0gQnVpbGRlcjwvaDM+XG5cdFx0XHRcdFx0PHA+XG5cdFx0XHRcdFx0XHRUaGlzIHByb2plY3QgaXMgYW4gb3BlbiBzb3VyY2UgcHJvamVjdCwgeW91IGNhbiB2aWV3IHRoZSBjb2RlIG9uIDxhIGhyZWY9J2h0dHA6Ly9naXRodWIuY29tL2hucnkvaXRlbWJ1aWxkZXInIHRhcmdldD0nX2JsYW5rJz5HaXRIdWI8L2E+XG5cdFx0XHRcdFx0PC9wPlxuXHRcdFx0XHRcdDxwPlxuXHRcdFx0XHRcdFx0SXQgd2FzIGNyZWF0ZWQgYXMgcGFydCBvZiB0aGUgUmlvdCAyLjAgQVBJIGNoYWxsZW5nZS5cblx0XHRcdFx0XHQ8L3A+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdFx0XHQ8c21hbGw+SXRlbSBCdWlsZGVyIGlzbid0IGVuZG9yc2VkIGJ5IFJpb3QgR2FtZXMgYW5kIGRvZXNuJ3QgcmVmbGVjdCB0aGUgdmlld3Mgb3Igb3BpbmlvbnMgb2YgUmlvdCBHYW1lcyBvciBhbnlvbmUgb2ZmaWNpYWxseSBpbnZvbHZlZCBpbiBwcm9kdWNpbmcgb3IgbWFuYWdpbmcgTGVhZ3VlIG9mIExlZ2VuZHMuIExlYWd1ZSBvZiBMZWdlbmRzIGFuZCBSaW90IEdhbWVzIGFyZSB0cmFkZW1hcmtzIG9yIHJlZ2lzdGVyZWQgdHJhZGVtYXJrcyBvZiBSaW90IEdhbWVzLCBJbmMuIExlYWd1ZSBvZiBMZWdlbmRzIMKpIFJpb3QgR2FtZXMsIEluYy48L3NtYWxsPlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbmZvO1xuIiwiLypcblx0b25Ib3ZlciBhbmQgZGlzcGxheSBJdGVtIGljb24gaW1hZ2VcbiAqL1xuXG5jbGFzcyBJdGVtQnV0dG9uIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0cG9wdXBIaWRlOiAnaXRlbS1wb3AtaGlkZScsXG5cdFx0XHRwb3B1cFNob3c6ICdpdGVtLXBvcC1zaG93Jyxcblx0XHRcdHBvcHVwOiAnaXRlbS1wb3AnXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHRwb3B1cDogZmFsc2UsXG5cdFx0XHRpdGVtOiB7fVxuXHRcdH07XG5cblx0XHR0aGlzLnRva2VuID0gMDtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdGxldCBpdGVtO1xuXHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXG5cdFx0dGhpcy50b2tlbiA9IEl0ZW1TdG9yZS5ub3RpZnkoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAodGhhdC5wcm9wcy5pdGVtKSB7XG5cdFx0XHRcdGl0ZW0gPSB0aGF0LnByb3BzLml0ZW07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpdGVtID0gSXRlbVN0b3JlLmdldEJ5SWQodGhhdC5wcm9wcy5pdGVtSWQpO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5zZXRTdGF0ZSh7IGl0ZW06IGl0ZW0gfSk7XHRcdFxuXHRcdH0pO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0SXRlbVN0b3JlLnVubm90aWZ5KHRoaXMudG9rZW4pO1xuXHR9XG5cblx0aGFuZGxlSG92ZXJPbigpIHtcblx0XHQvL2NvbnNvbGUubG9nKHRoaXMuc3RhdGUuaXRlbSk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHBvcHVwOiB0cnVlIH0pO1xuXHR9XG5cblx0aGFuZGxlSG92ZXJPZmYoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHBvcHVwOiBmYWxzZSB9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRpZiAoIXRoaXMuc3RhdGUuaXRlbSB8fCBPYmplY3Qua2V5cyh0aGlzLnN0YXRlLml0ZW0pLmxlbmd0aCA8IDEpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRsZXQgcG9wVXBEaXNwbGF5ID0gdGhpcy5zdHlsZXMucG9wdXBIaWRlO1xuXHRcdGlmICh0aGlzLnN0YXRlLnBvcHVwKSBwb3BVcERpc3BsYXkgPSB0aGlzLnN0eWxlcy5wb3B1cFNob3c7XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgZGF0YS1pdGVtLWlkPXt0aGlzLnN0YXRlLml0ZW0uaWR9PlxuXHRcdFx0PGltZyBzcmM9e3RoaXMuc3RhdGUuaXRlbS5nZXRJbWFnZSgpfSBvbk1vdXNlRW50ZXI9e3RoaXMuaGFuZGxlSG92ZXJPbi5iaW5kKHRoaXMpfSBvbk1vdXNlTGVhdmU9e3RoaXMuaGFuZGxlSG92ZXJPZmYuYmluZCh0aGlzKX0gLz5cblxuXHRcdFx0PGRpdiBjbGFzc05hbWU9eydyb3cgJyArIHRoaXMuc3R5bGVzLnBvcHVwICsgJyAnICsgcG9wVXBEaXNwbGF5fT5cblx0XHRcdFx0e3RoaXMuc3RhdGUuaXRlbS5uYW1lfVxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0e3RoaXMuc3RhdGUuaXRlbS5kZXNjcmlwdGlvbn1cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdHt0aGlzLnN0YXRlLml0ZW0uZ29sZC5iYXNlfSA8aW1nIHNyYz0naHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vNS41LjEvaW1nL3VpL2dvbGQucG5nJyAvPlxuXHRcdFx0PC9kaXY+XG5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbUJ1dHRvbjsiLCJjbGFzcyBTaGFyZSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHR3cmFwcGVyOiAncG9wdXAtd3JhcHBlcicsXG5cdFx0XHRjb250YWluZXI6ICdwb3B1cC1jb250YWluZXInLFxuXG5cdFx0XHRzaGFyZUNvbnRhaW5lcjogJ3NoYXJlLW1vZGFsJ1xuXHRcdH1cblx0fVxuXG5cdHJlbW92ZVNob3coYnV0dG9uQ2xpY2ssIGV2ZW50KSB7XG5cdFx0Y29uc3QgcmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmFwcF9oaWRlX3BvcHVwKCkpO1xuXHRcdH1cblxuXHRcdGlmIChidXR0b25DbGljay50YXJnZXQpIGV2ZW50ID0gYnV0dG9uQ2xpY2s7XG5cdFx0aWYgKGJ1dHRvbkNsaWNrID09PSB0cnVlKSB7XG5cdFx0XHRyZW1vdmUoKTtcdFx0XHRcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGV2ZW50LnRhcmdldCAmJiBldmVudC50YXJnZXQuY2xhc3NOYW1lID09PSB0aGlzLnN0eWxlcy53cmFwcGVyKSB7XG5cdFx0XHRcdHJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHQvLyBUT0RPXG5cdFx0Ly8gaWYgdXNpbmcgSFRNTDUgZmFsbGJhY2sgKC8jLylcblx0XHQvLyB0aGlzLmNvbnRleHQucm91dGVyLm1ha2VIcmVmIHJldHVybnMgIy9cblx0XHQvLyBzbyBoYXZlIHRvIHByZXBlbmQgYSAnLycgaW4gdGhpcyBjYXNlXG5cdFx0Y29uc3QgbGluayA9ICdodHRwOi8vJyArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgdGhpcy5jb250ZXh0LnJvdXRlci5tYWtlSHJlZigndmlldycsIHsgaWQ6IHRoaXMucHJvcHMuaWQgfSk7XG5cblx0XHRpZiAoIXRoaXMucHJvcHMuc2hvdykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMud3JhcHBlcn0gb25DbGljaz17dGhpcy5yZW1vdmVTaG93LmJpbmQodGhpcyl9PlxuXHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNvbnRhaW5lcn0+XG5cdFx0XHRcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5zaGFyZUNvbnRhaW5lcn0+XG5cdFx0XHRcdDxoMyBjbGFzc05hbWU9J3hmb250LXRoaW4nPlNoYXJlPC9oMz5cblx0XHRcdFx0PGhyIC8+XG5cdFx0XHRcdFNoYXJlIHlvdXIgaXRlbSBidWlsZCB3aXRoIG90aGVycyB1c2luZyB0aGlzIGxpbms6XG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHQ8aW5wdXQgdHlwZT0ndGV4dCcgZGVmYXVsdFZhbHVlPXtsaW5rfSByZWFkT25seSAvPlxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdE9yIHNoYXJlIGl0IG9uIHlvdXIgc29jaWFsIG1lZGlhLFxuXHRcdFx0PC9kaXY+XG5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn1cblxuU2hhcmUuY29udGV4dFR5cGVzID0ge1xuXHRyb3V0ZXI6IFJlYWN0LlByb3BUeXBlcy5mdW5jXG59XG5cbmV4cG9ydCBkZWZhdWx0IFNoYXJlOyIsImltcG9ydCBWaWV3QnVpbGQgZnJvbSAnLi92aWV3QnVpbGQnO1xuaW1wb3J0IFZpZXdEaXNwbGF5IGZyb20gJy4vdmlld0Rpc3BsYXknO1xuaW1wb3J0IEl0ZW1CdXR0b24gZnJvbSAnLi4vaXRlbUJ1dHRvbic7XG5cbmltcG9ydCBTaGFyZSBmcm9tICcuLi9zaGFyZSc7XG5pbXBvcnQgRG93bmxvYWQgZnJvbSAnLi4vZG93bmxvYWQnO1xuaW1wb3J0IEluZm8gZnJvbSAnLi4vaW5mbyc7XG5cbmNsYXNzIFZpZXcgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0XG5cdFx0dGhpcy5zdHlsZXMgPSB7fTtcblxuXHRcdHRoaXMuc3RhdGUgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zdGF0ZS5hcHAgPSBhcHBTdG9yZS5nZXRBbGwoKTtcblxuXHRcdHRoaXMudG9rZW5JdGVtU2V0U3RvcmUgPSAwO1xuXHRcdHRoaXMudG9rZW5BcHBTdG9yZSA9IDA7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLnRva2VuSXRlbVNldFN0b3JlID0gaXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKHRoaXMuX29uQ2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdHRoaXMudG9rZW5BcHBTdG9yZSA9IGFwcFN0b3JlLmFkZExpc3RlbmVyKHRoaXMuX29uQXBwQ2hhbmdlLmJpbmQodGhpcykpO1xuXG5cdFx0Ly8gVE9ETyBjb3VsZCBkbyBzb21lIHF1aWNrIElEIHZhbGlkYXRpb25cblx0XHQvLyB0byBkZXRlY3Qgb2J2aW91cyBiYWQgSURzIGFuZCBub3QgYm90aGVyIGxvYWRpbmcuLlxuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMubG9hZF9kYXRhKHRoaXMucHJvcHMucGFyYW1zLmlkKSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRpdGVtU2V0U3RvcmUucmVtb3ZlTGlzdGVuZXIoJycsIHRoaXMudG9rZW5JdGVtU2V0U3RvcmUpO1xuXHRcdGFwcFN0b3JlLnJlbW92ZUxpc3RlbmVyKCcnLCB0aGlzLnRva2VuQXBwU3RvcmUpO1xuXHR9XG5cblx0X29uQ2hhbmdlKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zZXRTdGF0ZShkYXRhKTtcblx0fVxuXHRcblx0X29uQXBwQ2hhbmdlKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBhcHBTdG9yZS5nZXRBbGwoKTtcblx0XHR0aGlzLnNldFN0YXRlKHsgYXBwOiBkYXRhIH0pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdC8vIGhhdmUgdG8gY2hlY2sgaWYgcmVzb3VyY2UgZXhpc3RzIFxuXHRcdC8vIGlmIG5vdCByZW5kZXIgc29tZXRoaW5nIGRpZmZlcmVudCBUT0RPXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXG5cdFx0XHRcdDxTaGFyZSBpZD17dGhpcy5zdGF0ZS5pZH0gc2hvdz17dGhpcy5zdGF0ZS5hcHAuc2hvd1NoYXJlfSAvPlxuXHRcdFx0XHQ8RG93bmxvYWQgc2hvdz17dGhpcy5zdGF0ZS5hcHAuc2hvd0Rvd25sb2FkfSBkYXRhPXt0aGlzLnN0YXRlLml0ZW1zZXR9IGlkPXt0aGlzLnN0YXRlLmlkfSAvPlxuXHRcdFx0XHQ8SW5mbyBzaG93PXt0aGlzLnN0YXRlLmFwcC5zaG93SW5mb30gLz5cblxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdFx0PGgyIGNsYXNzTmFtZT0neGZvbnQtdGhpbic+e3RoaXMuc3RhdGUuaXRlbXNldC50aXRsZX08L2gyPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxociAvPlxuXG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtNSBjb2wtc20tNSBjb2wtbWQtNSc+XG5cdFx0XHRcdFx0PFZpZXdEaXNwbGF5IGl0ZW1zZXQ9e3RoaXMuc3RhdGUuaXRlbXNldH0gLz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtNSBjb2wtc20tNSBjb2wtbWQtNSBjb2wteHMtb2Zmc2V0LTEgY29sLXNtLW9mZnNldC0xIGNvbC1tZC1vZmZzZXQtMSc+XG5cdFx0XHRcdFx0PFZpZXdCdWlsZCBhcGlWZXJzaW9uPXt0aGlzLnByb3BzLmFwaVZlcnNpb259IGRhdGE9e3RoaXMuc3RhdGV9IC8+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlldzsiLCJjbGFzcyBWaWV3QnVpbGQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGltYWdlQ2hhbXBpb246ICdpdGVtLWNoYW1waW9uLWltYWdlJyxcblx0XHR9XG5cblx0XHR0aGlzLm1hcHMgPSBbXG5cdFx0XHR7IGtleTogJ2FueScsIG5hbWU6ICdBbGwgTWFwcyd9LFxuXHRcdFx0eyBrZXk6ICdTUicsIG5hbWU6ICdTdW1tb25lclxcJ3MgUmlmdCd9LFxuXHRcdFx0eyBrZXk6ICdIQScsIG5hbWU6ICdIb3dsaW5nIEFieXNzJ30sXG5cdFx0XHR7IGtleTogJ1RUJywgbmFtZTogJ1R3aXN0ZWQgVHJlZWxpbmUnfSxcblx0XHRcdHsga2V5OiAnQ1MnLCBuYW1lOiAnQ3J5c3RhbCBTY2FyJ31cblx0XHRdO1xuXHR9XG5cblx0cmVuZGVyQ2hhbXBpb25JbWFnZSgpIHtcblx0XHRpZiAoIXRoaXMucHJvcHMuZGF0YS5jaGFtcGlvbi5yaW90S2V5KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0cmV0dXJuICg8aW1nIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuaW1hZ2VDaGFtcGlvbn0gc3JjPXsnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyB0aGlzLnByb3BzLmRhdGEuY2hhbXBpb24ucmlvdEtleSArICcucG5nJ30gLz4pO1xuXHR9XG5cblx0Z2V0TWFwTmFtZSgpIHtcblx0XHRsZXQgcjtcblx0XHR0aGlzLm1hcHMuZm9yRWFjaChtYXAgPT4ge1xuXHRcdFx0aWYgKG1hcC5rZXkgPT09IHRoaXMucHJvcHMuZGF0YS5pdGVtc2V0Lm1hcCkgciA9IG1hcC5uYW1lO1xuXHRcdH0pO1xuXHRcdHJldHVybiByO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0XG5cblxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9Jyc+XG5cdFx0XHRcdFx0XHRcdHt0aGlzLnJlbmRlckNoYW1waW9uSW1hZ2UoKX1cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9Jyc+XG5cdFx0XHRcdFx0XHRcdDxoMyBjbGFzc05hbWU9J3hmb250Jz57dGhpcy5wcm9wcy5kYXRhLmNoYW1waW9uLm5hbWV9PC9oMz5cblx0XHRcdFx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdFx0XHRcdHt0aGlzLnByb3BzLmRhdGEuY2hhbXBpb24udGl0bGV9XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0XHR7dGhpcy5nZXRNYXBOYW1lKCl9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlld0J1aWxkOyIsImltcG9ydCBJdGVtQnV0dG9uIGZyb20gJy4uL2l0ZW1CdXR0b24nO1xuXG5jbGFzcyBWaWV3RGlzcGxheSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ3ZpZXctZGlzcGxheScsXG5cdFx0XHRibG9jazogJ3ZpZXctZGlzcGxheS1ibG9jaycsXG5cdFx0XHRibG9ja1RpdGxlOiAndmlldy1kaXNwbGF5LWJsb2NrLXRpdGxlIHhmb250Jyxcblx0XHRcdGl0ZW1CdXR0b246ICdpdGVtLXNldC1idXR0b24tYmxvY2snLFxuXHRcdFx0aXRlbUNvdW50OiAnaXRlbS1zZXQtYnV0dG9uLWJsb2NrLWNvdW50IHZpZXctZGlzcGxheS1jb3VudCcsXG5cdFx0fVxuXHR9XG5cblx0cmVuZGVyQmxvY2tJdGVtcyhpdGVtcykge1xuXHRcdHJldHVybiBpdGVtcy5tYXAoKGl0ZW0sIGlkeCkgPT4ge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PGRpdiBrZXk9e2l0ZW0uaWQgKyAnLScgKyBpZHh9PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5pdGVtQnV0dG9ufT5cblx0XHRcdFx0XHRcdDxJdGVtQnV0dG9uIGl0ZW1JZD17aXRlbS5pZH0gLz5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuaXRlbUNvdW50fT57aXRlbS5jb3VudH08L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlckJsb2NrcygpIHtcblx0XHRyZXR1cm4gdGhpcy5wcm9wcy5pdGVtc2V0LmJsb2Nrcy5tYXAoKGJsb2NrLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuYmxvY2t9PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy5ibG9ja1RpdGxlfT48c3Bhbj57YmxvY2sudHlwZX08L3NwYW4+PC9kaXY+XG5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0XHRcdHt0aGlzLnJlbmRlckJsb2NrSXRlbXMoYmxvY2suaXRlbXMpfVxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy53cmFwcGVyfT5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy0xMiBjb2wtc20tMTIgY29sLW1kLTEyJz5cblx0XHRcdFx0e3RoaXMucmVuZGVyQmxvY2tzKCl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXdEaXNwbGF5OyJdfQ==
