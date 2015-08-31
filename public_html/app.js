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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXRvYS9hdG9hLmpzIiwibm9kZV9tb2R1bGVzL2NvbnRyYS9kZWJvdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvZW1pdHRlci5qcyIsIm5vZGVfbW9kdWxlcy9jb250cmEvbm9kZV9tb2R1bGVzL3RpY2t5L3RpY2t5LWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L25vZGVfbW9kdWxlcy9jdXN0b20tZXZlbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9jcm9zc3ZlbnQuanMiLCJub2RlX21vZHVsZXMvY3Jvc3N2ZW50L3NyYy9ldmVudG1hcC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9hcHAuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2NyZWF0ZS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbURpc3BsYXkvaW5kZXguanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1EaXNwbGF5L2l0ZW1DYXRlZ29yaWVzLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2NyZWF0ZS9pdGVtRGlzcGxheS9pdGVtRGlzcGxheS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbURpc3BsYXkvaXRlbVNlYXJjaC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9jaGFtcGlvblNlbGVjdC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9jcmVhdGVCbG9jay5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9pbmRleC5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9pdGVtQmxvY2suanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1TZXQvaXRlbUJsb2Nrcy5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9jcmVhdGUvaXRlbVNldC9tYXBTZWxlY3QuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvY3JlYXRlL2l0ZW1TZXQvdXBsb2FkLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2NyZWF0ZS9zYXZlUmVzdWx0LmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2Rvd25sb2FkLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2RyYWd1bGEvY2xhc3Nlcy5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9kcmFndWxhL2RyYWd1bGEuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvZHJhZ3VsYS9yZWFjdC1kcmFndWxhLmpzIiwiL1VzZXJzL2gvRG9jdW1lbnRzL2NvZGUvaXRlbWJ1aWxkZXIvc3JjL2luZm8uanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvaXRlbUJ1dHRvbi5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy9zaGFyZS5qcyIsIi9Vc2Vycy9oL0RvY3VtZW50cy9jb2RlL2l0ZW1idWlsZGVyL3NyYy92aWV3L3ZpZXcuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvdmlldy92aWV3QnVpbGQuanMiLCIvVXNlcnMvaC9Eb2N1bWVudHMvY29kZS9pdGVtYnVpbGRlci9zcmMvdmlldy92aWV3RGlzcGxheS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUM5QjtLQUNELENBQ0w7SUFDRixDQUFDLENBQUM7R0FDSDs7O1NBRUssa0JBQUc7QUFDUixVQUNDOztNQUFLLFNBQVMsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEFBQUM7SUFDM0MsSUFBSSxDQUFDLFlBQVksRUFBRTtJQUNmLENBQ0w7R0FDRjs7O1FBM0NJLFdBQVc7R0FBUyxLQUFLLENBQUMsU0FBUzs7cUJBK0MxQixXQUFXIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXRvYSAoYSwgbikgeyByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYSwgbik7IH1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRpY2t5ID0gcmVxdWlyZSgndGlja3knKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWJvdW5jZSAoZm4sIGFyZ3MsIGN0eCkge1xuICBpZiAoIWZuKSB7IHJldHVybjsgfVxuICB0aWNreShmdW5jdGlvbiBydW4gKCkge1xuICAgIGZuLmFwcGx5KGN0eCB8fCBudWxsLCBhcmdzIHx8IFtdKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXRvYSA9IHJlcXVpcmUoJ2F0b2EnKTtcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbWl0dGVyICh0aGluZywgb3B0aW9ucykge1xuICB2YXIgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBldnQgPSB7fTtcbiAgaWYgKHRoaW5nID09PSB1bmRlZmluZWQpIHsgdGhpbmcgPSB7fTsgfVxuICB0aGluZy5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIGlmICghZXZ0W3R5cGVdKSB7XG4gICAgICBldnRbdHlwZV0gPSBbZm5dO1xuICAgIH0gZWxzZSB7XG4gICAgICBldnRbdHlwZV0ucHVzaChmbik7XG4gICAgfVxuICAgIHJldHVybiB0aGluZztcbiAgfTtcbiAgdGhpbmcub25jZSA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIGZuLl9vbmNlID0gdHJ1ZTsgLy8gdGhpbmcub2ZmKGZuKSBzdGlsbCB3b3JrcyFcbiAgICB0aGluZy5vbih0eXBlLCBmbik7XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKGMgPT09IDEpIHtcbiAgICAgIGRlbGV0ZSBldnRbdHlwZV07XG4gICAgfSBlbHNlIGlmIChjID09PSAwKSB7XG4gICAgICBldnQgPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGV0ID0gZXZ0W3R5cGVdO1xuICAgICAgaWYgKCFldCkgeyByZXR1cm4gdGhpbmc7IH1cbiAgICAgIGV0LnNwbGljZShldC5pbmRleE9mKGZuKSwgMSk7XG4gICAgfVxuICAgIHJldHVybiB0aGluZztcbiAgfTtcbiAgdGhpbmcuZW1pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IGF0b2EoYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpbmcuZW1pdHRlclNuYXBzaG90KGFyZ3Muc2hpZnQoKSkuYXBwbHkodGhpcywgYXJncyk7XG4gIH07XG4gIHRoaW5nLmVtaXR0ZXJTbmFwc2hvdCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdmFyIGV0ID0gKGV2dFt0eXBlXSB8fCBbXSkuc2xpY2UoMCk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBhcmdzID0gYXRvYShhcmd1bWVudHMpO1xuICAgICAgdmFyIGN0eCA9IHRoaXMgfHwgdGhpbmc7XG4gICAgICBpZiAodHlwZSA9PT0gJ2Vycm9yJyAmJiBvcHRzLnRocm93cyAhPT0gZmFsc2UgJiYgIWV0Lmxlbmd0aCkgeyB0aHJvdyBhcmdzLmxlbmd0aCA9PT0gMSA/IGFyZ3NbMF0gOiBhcmdzOyB9XG4gICAgICBldC5mb3JFYWNoKGZ1bmN0aW9uIGVtaXR0ZXIgKGxpc3Rlbikge1xuICAgICAgICBpZiAob3B0cy5hc3luYykgeyBkZWJvdW5jZShsaXN0ZW4sIGFyZ3MsIGN0eCk7IH0gZWxzZSB7IGxpc3Rlbi5hcHBseShjdHgsIGFyZ3MpOyB9XG4gICAgICAgIGlmIChsaXN0ZW4uX29uY2UpIHsgdGhpbmcub2ZmKHR5cGUsIGxpc3Rlbik7IH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaW5nO1xuICAgIH07XG4gIH07XG4gIHJldHVybiB0aGluZztcbn07XG4iLCJ2YXIgc2kgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nLCB0aWNrO1xuaWYgKHNpKSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0SW1tZWRpYXRlKGZuKTsgfTtcbn0gZWxzZSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0VGltZW91dChmbiwgMCk7IH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGljazsiLCJcbnZhciBOYXRpdmVDdXN0b21FdmVudCA9IGdsb2JhbC5DdXN0b21FdmVudDtcblxuZnVuY3Rpb24gdXNlTmF0aXZlICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgcCA9IG5ldyBOYXRpdmVDdXN0b21FdmVudCgnY2F0JywgeyBkZXRhaWw6IHsgZm9vOiAnYmFyJyB9IH0pO1xuICAgIHJldHVybiAgJ2NhdCcgPT09IHAudHlwZSAmJiAnYmFyJyA9PT0gcC5kZXRhaWwuZm9vO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENyb3NzLWJyb3dzZXIgYEN1c3RvbUV2ZW50YCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQuQ3VzdG9tRXZlbnRcbiAqXG4gKiBAcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB1c2VOYXRpdmUoKSA/IE5hdGl2ZUN1c3RvbUV2ZW50IDpcblxuLy8gSUUgPj0gOVxuJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50ID8gZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICBpZiAocGFyYW1zKSB7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgfSBlbHNlIHtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UsIHZvaWQgMCk7XG4gIH1cbiAgcmV0dXJuIGU7XG59IDpcblxuLy8gSUUgPD0gOFxuZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gIGUudHlwZSA9IHR5cGU7XG4gIGlmIChwYXJhbXMpIHtcbiAgICBlLmJ1YmJsZXMgPSBCb29sZWFuKHBhcmFtcy5idWJibGVzKTtcbiAgICBlLmNhbmNlbGFibGUgPSBCb29sZWFuKHBhcmFtcy5jYW5jZWxhYmxlKTtcbiAgICBlLmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gIH0gZWxzZSB7XG4gICAgZS5idWJibGVzID0gZmFsc2U7XG4gICAgZS5jYW5jZWxhYmxlID0gZmFsc2U7XG4gICAgZS5kZXRhaWwgPSB2b2lkIDA7XG4gIH1cbiAgcmV0dXJuIGU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjdXN0b21FdmVudCA9IHJlcXVpcmUoJ2N1c3RvbS1ldmVudCcpO1xudmFyIGV2ZW50bWFwID0gcmVxdWlyZSgnLi9ldmVudG1hcCcpO1xudmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbnZhciBhZGRFdmVudCA9IGFkZEV2ZW50RWFzeTtcbnZhciByZW1vdmVFdmVudCA9IHJlbW92ZUV2ZW50RWFzeTtcbnZhciBoYXJkQ2FjaGUgPSBbXTtcblxuaWYgKCFnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICBhZGRFdmVudCA9IGFkZEV2ZW50SGFyZDtcbiAgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEhhcmQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhZGQ6IGFkZEV2ZW50LFxuICByZW1vdmU6IHJlbW92ZUV2ZW50LFxuICBmYWJyaWNhdGU6IGZhYnJpY2F0ZUV2ZW50XG59O1xuXG5mdW5jdGlvbiBhZGRFdmVudEVhc3kgKGVsLCB0eXBlLCBmbiwgY2FwdHVyaW5nKSB7XG4gIHJldHVybiBlbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZuLCBjYXB0dXJpbmcpO1xufVxuXG5mdW5jdGlvbiBhZGRFdmVudEhhcmQgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZWwuYXR0YWNoRXZlbnQoJ29uJyArIHR5cGUsIHdyYXAoZWwsIHR5cGUsIGZuKSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBsaXN0ZW5lciA9IHVud3JhcChlbCwgdHlwZSwgZm4pO1xuICBpZiAobGlzdGVuZXIpIHtcbiAgICByZXR1cm4gZWwuZGV0YWNoRXZlbnQoJ29uJyArIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmYWJyaWNhdGVFdmVudCAoZWwsIHR5cGUsIG1vZGVsKSB7XG4gIHZhciBlID0gZXZlbnRtYXAuaW5kZXhPZih0eXBlKSA9PT0gLTEgPyBtYWtlQ3VzdG9tRXZlbnQoKSA6IG1ha2VDbGFzc2ljRXZlbnQoKTtcbiAgaWYgKGVsLmRpc3BhdGNoRXZlbnQpIHtcbiAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICB9IGVsc2Uge1xuICAgIGVsLmZpcmVFdmVudCgnb24nICsgdHlwZSwgZSk7XG4gIH1cbiAgZnVuY3Rpb24gbWFrZUNsYXNzaWNFdmVudCAoKSB7XG4gICAgdmFyIGU7XG4gICAgaWYgKGRvYy5jcmVhdGVFdmVudCkge1xuICAgICAgZSA9IGRvYy5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgIGUuaW5pdEV2ZW50KHR5cGUsIHRydWUsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoZG9jLmNyZWF0ZUV2ZW50T2JqZWN0KSB7XG4gICAgICBlID0gZG9jLmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBlO1xuICB9XG4gIGZ1bmN0aW9uIG1ha2VDdXN0b21FdmVudCAoKSB7XG4gICAgcmV0dXJuIG5ldyBjdXN0b21FdmVudCh0eXBlLCB7IGRldGFpbDogbW9kZWwgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JhcHBlckZhY3RvcnkgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlciAob3JpZ2luYWxFdmVudCkge1xuICAgIHZhciBlID0gb3JpZ2luYWxFdmVudCB8fCBnbG9iYWwuZXZlbnQ7XG4gICAgZS50YXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCA9IGUucHJldmVudERlZmF1bHQgfHwgZnVuY3Rpb24gcHJldmVudERlZmF1bHQgKCkgeyBlLnJldHVyblZhbHVlID0gZmFsc2U7IH07XG4gICAgZS5zdG9wUHJvcGFnYXRpb24gPSBlLnN0b3BQcm9wYWdhdGlvbiB8fCBmdW5jdGlvbiBzdG9wUHJvcGFnYXRpb24gKCkgeyBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7IH07XG4gICAgZS53aGljaCA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIGZuLmNhbGwoZWwsIGUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB3cmFwIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIHdyYXBwZXIgPSB1bndyYXAoZWwsIHR5cGUsIGZuKSB8fCB3cmFwcGVyRmFjdG9yeShlbCwgdHlwZSwgZm4pO1xuICBoYXJkQ2FjaGUucHVzaCh7XG4gICAgd3JhcHBlcjogd3JhcHBlcixcbiAgICBlbGVtZW50OiBlbCxcbiAgICB0eXBlOiB0eXBlLFxuICAgIGZuOiBmblxuICB9KTtcbiAgcmV0dXJuIHdyYXBwZXI7XG59XG5cbmZ1bmN0aW9uIHVud3JhcCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBpID0gZmluZChlbCwgdHlwZSwgZm4pO1xuICBpZiAoaSkge1xuICAgIHZhciB3cmFwcGVyID0gaGFyZENhY2hlW2ldLndyYXBwZXI7XG4gICAgaGFyZENhY2hlLnNwbGljZShpLCAxKTsgLy8gZnJlZSB1cCBhIHRhZCBvZiBtZW1vcnlcbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGksIGl0ZW07XG4gIGZvciAoaSA9IDA7IGkgPCBoYXJkQ2FjaGUubGVuZ3RoOyBpKyspIHtcbiAgICBpdGVtID0gaGFyZENhY2hlW2ldO1xuICAgIGlmIChpdGVtLmVsZW1lbnQgPT09IGVsICYmIGl0ZW0udHlwZSA9PT0gdHlwZSAmJiBpdGVtLmZuID09PSBmbikge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBldmVudG1hcCA9IFtdO1xudmFyIGV2ZW50bmFtZSA9ICcnO1xudmFyIHJvbiA9IC9eb24vO1xuXG5mb3IgKGV2ZW50bmFtZSBpbiBnbG9iYWwpIHtcbiAgaWYgKHJvbi50ZXN0KGV2ZW50bmFtZSkpIHtcbiAgICBldmVudG1hcC5wdXNoKGV2ZW50bmFtZS5zbGljZSgyKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBldmVudG1hcDtcbiIsInZhciBSb3V0ZXIgPSB3aW5kb3cuUmVhY3RSb3V0ZXI7XG52YXIgRGVmYXVsdFJvdXRlID0gUm91dGVyLkRlZmF1bHRSb3V0ZTtcbnZhciBSb3V0ZSA9IFJvdXRlci5Sb3V0ZTtcbnZhciBSb3V0ZUhhbmRsZXIgPSBSb3V0ZXIuUm91dGVIYW5kbGVyO1xudmFyIExpbmsgPSBSb3V0ZXIuTGluaztcblxuaW1wb3J0IENyZWF0ZSBmcm9tICcuL2NyZWF0ZS9jcmVhdGUnO1xuaW1wb3J0IFZpZXcgZnJvbSAnLi92aWV3L3ZpZXcnO1xuXG52YXIgQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXG5cdHN0eWxlczoge1xuXHRcdGRpc2FibGVOYXY6ICdkaXNhYmxlJ1xuXHR9LFxuXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgaW5pdElEID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVZlcnNpb246ICc1LjE2LjEnLFxuXHRcdFx0aWQ6IGluaXRJRC5pZCxcblx0XHR9O1xuXHR9LFxuXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHQvLyBnZXRzIGFsZXJ0ZWQgb24gZXZlcnkgc2F2ZSBhdHRlbXB0LCBldmVuIGZvciBmYWlsIHNhdmVzXG5cdFx0aXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKCdpZCcsIHRoaXMuX29uQ2hhbmdlKTtcblx0fSxcblxuXHRfb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGlkOiBkYXRhLmlkIH0pO1xuXHR9LFxuXG5cdG1peGluczogW1JvdXRlci5TdGF0ZV0sXG5cblx0X29uTmF2U2F2ZTogZnVuY3Rpb24oZSkge1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuc2F2ZV9pdGVtc2V0KCkpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRfb25OYXZEb3dubG9hZDogZnVuY3Rpb24oZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5zaG93X2Rvd25sb2FkKCkpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRfb25OYXZTaGFyZTogZnVuY3Rpb24oZSkge1xuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5zaG93X3NoYXJlKCkpO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHRfb25OYXZJbmZvOiBmdW5jdGlvbihlKSB7XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnNob3dfaW5mbygpKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblxuXHRyZW5kZXJMaW5rczogZnVuY3Rpb24obGluaywgZ2x5cGgsIG5hbWUpIHtcdFx0XHRcblx0XHQvKlxuXHRcdFx0VGhlIG1vZGUgd2UgYXJlIGluIGRlcGVuZHMgb24gaWYgd2UgaGF2ZSBkb2N1bWVudCBJRCBmb3IgYW4gaXRlbXNldFxuXHRcdFx0RGlmZmVyZW50IGxpbmtzIGZvciBkaWZmZXJlbnQgbW9kZXNcblx0XHRcdFRoZXJlIGlzIGEgdmlldyBtb2RlXG5cdFx0XHRBbmQgYSBjcmVhdGUgbW9kZVxuXHRcdCAqL1xuXHRcdGNvbnN0IGlkID0gdGhpcy5zdGF0ZS5pZDtcblxuXHRcdGNvbnN0IHZpZXdMaW5rcyA9IFtcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgZ2x5cGg6ICdnbHlwaGljb24tZmlsZScsIHRleHQ6ICdOZXcnIH0sXG5cdFx0XHR7IHVybDogJ2VkaXQnLCBwYXJhbXM6IGlkLCBnbHlwaDogJ2dseXBoaWNvbi1wZW5jaWwnLCB0ZXh0OiAnRWRpdCcgfSxcdFx0XHRcblx0XHRcdHsgdXJsOiAndmlldycsIHBhcmFtczogaWQsIG9uQ2xpY2s6IHRoaXMuX29uTmF2RG93bmxvYWQsIGdseXBoOiAnZ2x5cGhpY29uLXNhdmUnLCB0ZXh0OiAnRG93bmxvYWQnIH0sXG5cdFx0XHR7IHVybDogJ3ZpZXcnLCBwYXJhbXM6IGlkLCBvbkNsaWNrOiB0aGlzLl9vbk5hdlNoYXJlLCBnbHlwaDogJ2dseXBoaWNvbi1zaGFyZScsIHRleHQ6ICdTaGFyZScgfSxcblx0XHRcdHsgdXJsOiAndmlldycsIHBhcmFtczogaWQsIG9uQ2xpY2s6IHRoaXMuX29uTmF2SW5mbywgZ2x5cGg6ICdnbHlwaGljb24tZXF1YWxpemVyJywgdGV4dDogJ0Fib3V0JyB9LFxuXHRcdF07XG5cdFx0bGV0IGNyZWF0ZUxpbmtzID0gW1xuXHRcdFx0eyB1cmw6ICdjcmVhdGUnLCBnbHlwaDogJ2dseXBoaWNvbi1maWxlJywgdGV4dDogJ05ldycgfSxcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgb25DbGljazogdGhpcy5fb25OYXZTYXZlLCBnbHlwaDogJ2dseXBoaWNvbi1vaycsIHRleHQ6ICdTYXZlJyB9LFxuXHRcdFx0Ly8gdGhlIHJlc3Qgb2YgdGhlc2UgbGlua3Mgb25seSBhdmFpbGFibGUgaWYgc2F2ZWRcblx0XHRcdHsgdXJsOiAndmlldycsIHBhcmFtczogaWQsIGdseXBoOiAnZ2x5cGhpY29uLXVuY2hlY2tlZCcsIHRleHQ6ICdWaWV3JywgbmVlZElEOiB0cnVlIH0sXG5cdFx0XHR7IHVybDogJ2NyZWF0ZScsIG9uQ2xpY2s6IHRoaXMuX29uTmF2RG93bmxvYWQsIGdseXBoOiAnZ2x5cGhpY29uLXNhdmUnLCB0ZXh0OiAnRG93bmxvYWQnLCBuZWVkSUQ6IHRydWUgfSxcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgb25DbGljazogdGhpcy5fb25OYXZTaGFyZSwgZ2x5cGg6ICdnbHlwaGljb24tc2hhcmUnLCB0ZXh0OiAnU2hhcmUnLCBuZWVkSUQ6IHRydWUgfSxcblx0XHRcdHsgdXJsOiAnY3JlYXRlJywgb25DbGljazogdGhpcy5fb25OYXZJbmZvLCBnbHlwaDogJ2dseXBoaWNvbi1lcXVhbGl6ZXInLCB0ZXh0OiAnQWJvdXQnIH0sXG5cdFx0XTtcblxuXHRcdGxldCBtb2RlID0gY3JlYXRlTGlua3M7XG5cdFx0aWYgKHRoaXMuaXNBY3RpdmUoJ3ZpZXcnKSkge1xuXHRcdFx0bW9kZSA9IHZpZXdMaW5rcztcblx0XHR9XG5cblx0XHRyZXR1cm4gbW9kZS5tYXAobGluayA9PiB7XG5cdFx0XHRjb25zdCBpbm5lciA9IChcblx0XHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdzaWRlYmFyLWljb24nPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPXsnZ2x5cGhpY29uICcgKyBsaW5rLmdseXBofT48L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PHNwYW4+e2xpbmsudGV4dH08L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXG5cdFx0XHRsZXQgcjtcblxuXHRcdFx0Ly8gZGlzYWJsZSBjZXJ0YWluIG1lbnUgb3B0aW9ucyB3aGVuIHdlIGRvbid0XG5cdFx0XHQvLyBoYXZlIGFuIElEXG5cdFx0XHRpZiAobGluay5uZWVkSUQgJiYgIXRoaXMuc3RhdGUuaWQpIHtcblx0XHRcdFx0XHRyID0gKFxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmRpc2FibGVOYXZ9PlxuXHRcdFx0XHRcdFx0e2lubmVyfVxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChsaW5rWydvbkNsaWNrJ10pIHtcblx0XHRcdFx0XHRyID0gKDxMaW5rIHRvPXtsaW5rLnVybH0gcGFyYW1zPXt7aWQ6IGxpbmsucGFyYW1zfX0gb25DbGljaz17bGlua1snb25DbGljayddfT57aW5uZXJ9PC9MaW5rPik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyID0gKDxMaW5rIHRvPXtsaW5rLnVybH0gcGFyYW1zPXt7aWQ6IGxpbmsucGFyYW1zfX0+e2lubmVyfTwvTGluaz4pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtsaW5rLnRleHQgKyAobGluay5wYXJhbXMgfHwgJycpfSBjbGFzc05hbWU9J3NpZGViYXItbGluayc+XG5cdFx0XHRcdFx0e3J9XG5cdFx0XHRcdDwvZGl2Plx0XHRcdFxuXHRcdFx0KTtcblx0XHR9KTtcblx0fSxcblx0XG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2PlxuXHRcdFx0PGRpdiBjbGFzc05hbWU9J2NvbC14cy0yIGNvbC1tZC0yIHNpZGViYXInPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nc2lkZWJhci1sb2dvJz5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9J3NpZGViYXItbGluay10ZXh0IHhmb250LXRoaW4nPkl0ZW0gQnVpbGRlcjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcblx0XHRcdFx0e3RoaXMucmVuZGVyTGlua3MoKX1cblx0XHRcdDwvZGl2PlxuXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTkgY29sLW1kLTkgY29sLXhzLW9mZnNldC0xIGNvbC1tZC1vZmZzZXQtMSBjb250ZW50Jz5cblx0XHRcdFx0PFJvdXRlSGFuZGxlciBhcGlWZXJzaW9uPXt0aGlzLnN0YXRlLmFwaVZlcnNpb259IC8+XG5cdFx0XHQ8L2Rpdj5cblxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufSk7XG5cblxudmFyIHJvdXRlcyA9IChcblx0PFJvdXRlIG5hbWU9J2FwcCcgcGF0aD0nLycgaGFuZGxlcj17QXBwfT5cblx0XHQ8Um91dGUgbmFtZT0nY3JlYXRlJyBoYW5kbGVyPXtDcmVhdGV9IC8+XG5cdFx0PFJvdXRlIG5hbWU9J3ZpZXcnIHBhdGg9XCJ2aWV3LzppZFwiIGhhbmRsZXI9e1ZpZXd9IC8+XG5cdFx0PFJvdXRlIG5hbWU9J2VkaXQnIHBhdGg9XCJlZGl0LzppZFwiIGhhbmRsZXI9e0NyZWF0ZX0gLz5cblx0XHQ8RGVmYXVsdFJvdXRlIGhhbmRsZXI9e0NyZWF0ZX0gLz5cblx0PC9Sb3V0ZT5cbik7XG5cblJvdXRlci5ydW4ocm91dGVzLCBSb3V0ZXIuSGlzdG9yeUxvY2F0aW9uLCBmdW5jdGlvbihIYW5kbGVyKSB7XG5cdFJlYWN0LnJlbmRlcig8SGFuZGxlciAvPiwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpKTtcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBBcHA7IiwiaW1wb3J0IEl0ZW1EaXNwbGF5V2lkZ2V0IGZyb20gJy4vaXRlbURpc3BsYXkvaW5kZXgnO1xuaW1wb3J0IEl0ZW1TZXRXaWRnZXQgZnJvbSAnLi9pdGVtU2V0L2luZGV4JztcbmltcG9ydCBTYXZlUmVzdWx0IGZyb20gJy4vc2F2ZVJlc3VsdCc7XG5pbXBvcnQgSW5mbyBmcm9tICcuLi9pbmZvJztcblxuY2xhc3MgQ3JlYXRlIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHQvKlxuXHRcdFx0Y2hhbXBTZWxlY3RXcmFwOiAnaXRlbS1jaGFtcC1zZWxlY3Qtd3JhcCcsXG5cdFx0XHRjaGFtcFNlbGVjdDogJ2l0ZW0tY2hhbXAtc2VsZWN0Jyxcblx0XHRcdGNoYW1waW9uU2VsZWN0QmxvY2s6ICdpdGVtLWNoYW1wLXNlbGVjdC1ibG9jaydcblx0XHRcdCovXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKClcblx0XHR0aGlzLnN0YXRlLmFwcCA9IGFwcFN0b3JlLmdldEFsbCgpO1xuXG5cdFx0dGhpcy50b2tlbkNoYW1waW9uID0gMDtcblx0XHR0aGlzLnRva2VuSXRlbVNldCA9IDA7XG5cdFx0dGhpcy50b2tlbkl0ZW1TdG9yZSA9IDA7XG5cdFx0dGhpcy50b2tlbkFwcFN0b3JlID0gMDtcblx0fVxuXG5cdHN0YXRpYyB3aWxsVHJhbnNpdGlvblRvKHRyYW5zaXRpb24sIGNvbnRleHQpIHtcblx0XHRpZiAodHJhbnNpdGlvbi5wYXRoLmluZGV4T2YoJy9lZGl0LycpID09PSAwKSB7XG5cdFx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmxvYWRfZGF0YShjb250ZXh0LmlkKSk7XG5cdFx0fSBlbHNlIGlmICh0cmFuc2l0aW9uLnBhdGguaW5kZXhPZignL2NyZWF0ZScpID09PSAwIHx8IHRyYW5zaXRpb24ucGF0aCA9PSAnLycpIHtcblx0XHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMucmVzZXRfYWxsKCkpO1xuXHRcdH1cblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXG5cdFx0dGhpcy50b2tlbkl0ZW1TdG9yZSA9IEl0ZW1TdG9yZS5ub3RpZnkoZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGF0LnNldFN0YXRlKHsgaXRlbXM6IEl0ZW1TdG9yZS5pdGVtcyB9KTtcblx0XHR9KTtcblxuXG5cdFx0dGhpcy50b2tlbkNoYW1waW9uID0gaXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKCdjaGFtcGlvbicsIHRoaXMuX29uQ2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdHRoaXMudG9rZW5JdGVtU2V0ID0gaXRlbVNldFN0b3JlLmFkZExpc3RlbmVyKCdpZCcsIHRoaXMuX29uQ2hhbmdlLmJpbmQodGhpcykpO1xuXG5cblx0XHR0aGlzLnRva2VuQXBwU3RvcmUgPSBhcHBTdG9yZS5hZGRMaXN0ZW5lcih0aGlzLl9vbkFwcENoYW5nZS5iaW5kKHRoaXMpKTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEl0ZW1TdG9yZS51bm5vdGlmeSh0aGlzLnRva2VuSXRlbVN0b3JlKTtcblx0XHRpdGVtU2V0U3RvcmUucmVtb3ZlTGlzdGVuZXIoJ2NoYW1waW9uJywgdGhpcy50b2tlbkNoYW1waW9uKTtcblx0XHRpdGVtU2V0U3RvcmUucmVtb3ZlTGlzdGVuZXIoJ2lkJywgdGhpcy50b2tlbkl0ZW1TZXQpO1xuXHRcdGFwcFN0b3JlLnJlbW92ZUxpc3RlbmVyKCcnLCB0aGlzLnRva2VuQXBwU3RvcmUpO1xuXHR9XG5cblx0X29uQ2hhbmdlKCkge1xuXHRcdGNvbnN0IGRhdGEgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGNoYW1waW9uOiBkYXRhLmNoYW1waW9uLCBzYXZlU3RhdHVzOiBkYXRhLnNhdmVTdGF0dXMgfSk7XG5cdH1cblxuXHRfb25BcHBDaGFuZ2UoKSB7XG5cdFx0Y29uc3QgZGF0YSA9IGFwcFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBhcHA6IGRhdGEgfSk7XHRcdFxuXHR9XG5cblx0b25DaGFtcGlvblNlbGVjdChjaGFtcGlvbk9iaikge1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuY2hhbXBpb25fdXBkYXRlKGNoYW1waW9uT2JqKSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcdFx0XHRcblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHQ8U2F2ZVJlc3VsdCByZXN1bHQ9e3RoaXMuc3RhdGUuYXBwLnNhdmVTdGF0dXN9IC8+XG5cdFx0XHRcdDxJbmZvIHNob3c9e3RoaXMuc3RhdGUuYXBwLnNob3dJbmZvfSAvPlxuXG5cdFx0XHRcdDxJdGVtRGlzcGxheVdpZGdldCBpdGVtcz17dGhpcy5zdGF0ZS5pdGVtc30gLz5cblx0XHRcdFx0PEl0ZW1TZXRXaWRnZXQgYXBpVmVyc2lvbj17dGhpcy5wcm9wcy5hcGlWZXJzaW9ufSAgY2hhbXBpb249e3RoaXMuc3RhdGUuY2hhbXBpb259IHNob3dEb3dubG9hZD17dGhpcy5zdGF0ZS5hcHAuc2hvd0Rvd25sb2FkfSBzaG93U2hhcmU9e3RoaXMuc3RhdGUuYXBwLnNob3dTaGFyZX0gaGFuZGxlQ2hhbXBpb25TZWxlY3Q9e3RoaXMub25DaGFtcGlvblNlbGVjdC5iaW5kKHRoaXMpfSAvPlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IENyZWF0ZTtcbiIsImltcG9ydCBJdGVtQ2F0ZWdvcmllcyBmcm9tICcuL2l0ZW1DYXRlZ29yaWVzJztcbmltcG9ydCBJdGVtRGlzcGxheSBmcm9tICcuL2l0ZW1EaXNwbGF5JztcbmltcG9ydCBJdGVtU2VhcmNoIGZyb20gJy4vaXRlbVNlYXJjaCc7XG5cbmNvbnN0IGdldEJhc2VDYXRlZ29yaWVzID0gZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGJhc2VDYXRlZ29yaWVzID0ge1xuXHRcdFx0XHQnQWxsIEl0ZW1zJzogW10sXG5cdFx0XHRcdCdTdGFydGluZyBJdGVtcyc6IFtcblx0XHRcdFx0XHR7IG5hbWU6ICdKdW5nbGUnLCB0YWdzOiBbJ0p1bmdsZSddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdMYW5lJywgdGFnczogWydMYW5lJ10sIGNoZWNrZWQ6IGZhbHNlIH1cblx0XHRcdFx0XSxcblx0XHRcdFx0J1Rvb2xzJzogW1xuXHRcdFx0XHRcdHsgbmFtZTogJ0NvbnN1bWFibGUnLCB0YWdzOiBbJ0NvbnN1bWFibGUnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnR29sZCBJbmNvbWUnLCB0YWdzOiBbJ0dvbGRQZXInXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnVmlzaW9uICYgVHJpbmtldHMnLCB0YWdzOiBbJ1Zpc2lvbicsICdUcmlua2V0J10sIGNoZWNrZWQ6IGZhbHNlIH1cblx0XHRcdFx0XSxcblx0XHRcdFx0J0RlZmVuc2UnOiBbXG5cdFx0XHRcdFx0eyBuYW1lOiAnQXJtb3InLCB0YWdzOiBbJ0FybW9yJ10sIGNoZWNrZWQ6IGZhbHNlIH0sXG5cdFx0XHRcdFx0eyBuYW1lOiAnSGVhbHRoJywgdGFnczogWydIZWFsdGgnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnSGVhbHRoIFJlZ2VuJywgdGFnczogWydIZWFsdGhSZWdlbiddLCBjaGVja2VkOiBmYWxzZSB9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdCdBdHRhY2snOiBbXG5cdFx0XHRcdFx0eyBuYW1lOiAnQXR0YWNrIFNwZWVkJywgdGFnczogWydBdHRhY2tTcGVlZCddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdDcml0aWNhbCBTdHJpa2UnLCB0YWdzOiBbJ0NyaXRpY2FsU3RyaWtlJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0RhbWFnZScsIHRhZ3M6IFsnRGFtYWdlJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ0xpZmUgU3RlYWwnLCB0YWdzOiBbJ0xpZmVTdGVhbCcsICdTcGVsbFZhbXAnXSwgY2hlY2tlZDogZmFsc2UgfVxuXHRcdFx0XHRdLFxuXHRcdFx0XHQnTWFnaWMnOiBbXG5cdFx0XHRcdFx0eyBuYW1lOiAnQ29vbGRvd24gUmVkdWN0aW9uJywgdGFnczogWydDb29sZG93blJlZHVjdGlvbiddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdNYW5hJywgdGFnczogWydNYW5hJ10sIGNoZWNrZWQ6IGZhbHNlIH0sIFxuXHRcdFx0XHRcdHsgbmFtZTogJ01hbmEgUmVnZW4nLCB0YWdzOiBbJ01hbmFSZWdlbiddLCBjaGVja2VkOiBmYWxzZSB9LCBcblx0XHRcdFx0XHR7IG5hbWU6ICdBYmlsaXR5IFBvd2VyJywgdGFnczogWydTcGVsbERhbWFnZSddLCBjaGVja2VkOiBmYWxzZSB9XG5cdFx0XHRcdF0sXG5cdFx0XHRcdCdNb3ZlbWVudCc6IFtcblx0XHRcdFx0XHR7IG5hbWU6ICdCb290cycsIHRhZ3M6IFsnQm9vdHMnXSwgY2hlY2tlZDogZmFsc2UgfSwgXG5cdFx0XHRcdFx0eyBuYW1lOiAnT3RoZXIgTW92ZW1lbnQnLCB0YWdzOiBbJ05vbmJvb3RzTW92ZW1lbnQnXSwgY2hlY2tlZDogZmFsc2UgfVxuXHRcdFx0XHRdXG5cdH07XG5cdHJldHVybiBiYXNlQ2F0ZWdvcmllcztcbn1cblxuY2xhc3MgSXRlbURpc3BsYXlXaWRnZXQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHRpdGVtRGlzcGxheVdyYXBwZXI6ICcgaXRlbS1kaXNwbGF5LWJveC13cmFwJyxcblx0XHR9O1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHsgY2F0ZWdvcmllczogZ2V0QmFzZUNhdGVnb3JpZXMoKSwgc2VhcmNoOiAnJ307XG5cdH1cblxuXHRjaGFuZ2VDYXRlZ29yaWVzKGNhdGVnb3J5TmFtZSwgc3ViQ2F0ZWdvcnkpIHtcblx0XHRsZXQgY2F0cyA9IFtdO1xuXHRcdGxldCBjYXRlZ29yaWVzID0gdGhpcy5zdGF0ZS5jYXRlZ29yaWVzO1xuXG5cdFx0aWYgKHR5cGVvZiBzdWJDYXRlZ29yeSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdC8vIHJlc2V0IGFsbCBjaGVja3Mgd2hlbiBhIHBhcmVudCBjYXRlZ29yeSBpcyBjbGlja2VkXG5cdFx0XHQvLyBcblx0XHRcdC8vIFRPRE8hIHRoaXMgbWFrZXMgaXQgc2V0IGEgYnVuY2ggb2YgQU5EIHRhZ3MgdG8gZmlsdGVyXG5cdFx0XHQvLyB3ZSB3YW50IE9SLCB3ZSBtaWdodCBub3QgZXZlbiB3YW50IHRoaXMgY29kZSBoZXJlLi4uXG5cdFx0XHRjYXRlZ29yaWVzID0gZ2V0QmFzZUNhdGVnb3JpZXMoKTtcblx0XHRcdGNhdHMgPSBBcnJheS5hcHBseSgwLCBBcnJheShjYXRlZ29yaWVzW2NhdGVnb3J5TmFtZV0ubGVuZ3RoKSkubWFwKCh4LCB5KSA9PiB5KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2F0cy5wdXNoKHN1YkNhdGVnb3J5KTtcblx0XHR9XG5cblx0XHQvLyBoYWNreSBhbmQgdG9vIHN0cmljdCBhbmQgbGl0ZXJhbCwgYnV0IHdoYXRldmVyXG5cdFx0aWYgKGNhdGVnb3J5TmFtZSAhPT0gJ0FsbCBJdGVtcycpIHtcblx0XHRcdGNhdHMuZm9yRWFjaChjYXQgPT4ge1xuXHRcdFx0XHRjb25zdCBjID0gY2F0ZWdvcmllc1tjYXRlZ29yeU5hbWVdW2NhdF07XG5cdFx0XHRcdChjLmNoZWNrZWQpID8gYy5jaGVja2VkID0gZmFsc2UgOiBjLmNoZWNrZWQgPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsIHNlYXJjaDogJycgfSk7XG5cdH1cblxuXHRjaGFuZ2VTZWFyY2goc2VhcmNoVGVybSkge1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBzZWFyY2g6IHNlYXJjaFRlcm0sIGNhdGVnb3JpZXM6IGdldEJhc2VDYXRlZ29yaWVzKCkgfSk7XG5cdH1cblxuXHQvKlxuXHRcdFJldHVybnMgaXRlbXMgZmlsdGVyZWQgYnkgc2VhcmNoIG9yIGNhdGVnb3J5IG9yIG5vbmVcblxuXHRcdFRPRE8hISFcblx0XHRmaWx0ZXJUYWdzIHdpdGggY2F0ZWdvcmllcyB3aXRoIG1vcmUgdGhhbiAxIHRhZyBjYXVzZXMgYSBBTkQgY29uZGl0aW9uXG5cdFx0YnV0IGl0IHNob3VsZCBiZSBhbiBPUiBjb25kaXRpb24gSnVuZ2xlIGFuZCBWaXNpb24gJiBUcmlua2V0XG5cdFx0bWVhbnMgaXQgbWF0Y2hlcyBbanVuZ2xlLCB2aXNpb24sIHRyaW5rZXRdXG5cdFx0YnV0IGl0IHNob3VsZCBiZSBbanVuZ2xlXSBhbmQgW3Zpc2lvbiBPUiB0cmlua2V0XVxuXHQgKi9cblx0Z2V0SXRlbXMoKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLml0ZW1zKSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXHRcdC8vIHdlIGNvdWxkIGp1c3QgbGVhdmUgZmlsdGVyQnkgYXMgJ3NlYXJjaCcgYnkgZGVmYXVsdFxuXHRcdC8vIHNpbmNlIGl0IHdpbGwgYWxzbyByZXR1cm4gYWxsIGl0ZW1zIGlmIHNlYXJjaCA9PT0gJydcblx0XHQvLyBidXQgaSBmaWd1cmUgaXQgd2lsbCBiZSBtb3JlIHBlcmZvcm1hbnQgaWYgdGhlcmUgaXMgbm8gaW5kZXhPZiBjaGVja1xuXHRcdC8vIGZvciBldmVyeSBpdGVtXG5cdFx0bGV0IGZpbHRlckJ5O1xuXHRcdGxldCBmaWx0ZXJUYWdzID0gW107XG5cblx0XHQvLyBjaGVjayBpZiBpdCdzIGJ5IHNlYXJjaCBmaXJzdCB0byBhdm9pZCBsb29waW5nIGNhdGVnb3JpZXMgZm9yIHRhZ3Ncblx0XHRpZiAodGhpcy5zdGF0ZS5zZWFyY2ggJiYgdGhpcy5zdGF0ZS5zZWFyY2ggIT09ICcnKSB7XG5cdFx0XHRmaWx0ZXJCeSA9ICdzZWFyY2gnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRPYmplY3Qua2V5cyh0aGlzLnN0YXRlLmNhdGVnb3JpZXMpLmZvckVhY2goa2V5ID0+IHtcblx0XHRcdFx0dGhpcy5zdGF0ZS5jYXRlZ29yaWVzW2tleV0uZm9yRWFjaChjYXQgPT4ge1xuXHRcdFx0XHRcdGlmIChjYXQuY2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0Y2F0LnRhZ3MuZm9yRWFjaCh0YWcgPT4gZmlsdGVyVGFncy5wdXNoKHRhZykpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKGZpbHRlclRhZ3MubGVuZ3RoKSBmaWx0ZXJCeSA9ICd0YWdzJztcblx0XHR9XG5cblx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpcy5wcm9wcy5pdGVtcykucmVkdWNlKChyLCBpdGVtSUQpID0+IHtcblx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLnByb3BzLml0ZW1zW2l0ZW1JRF07XG5cdFx0XHQvLyBmaWx0ZXIgYnkgc2VhcmNoIG9yIHRhZ3Mgb3Igbm9uZVxuXHRcdFx0aWYgKGZpbHRlckJ5ID09PSAnc2VhcmNoJykge1xuXHRcdFx0XHRpZiAoaXRlbS5uYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0aGlzLnN0YXRlLnNlYXJjaC50b0xvd2VyQ2FzZSgpKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRyLnB1c2goaXRlbSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gYWxzbyB1c2Ugc2VhcmNoIHRlcm0gb24gdGFnc1xuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGl0ZW0udGFncy5maWx0ZXIodGFnID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiB0YWcudG9Mb3dlckNhc2UoKSA9PT0gdGhpcy5zdGF0ZS5zZWFyY2gudG9Mb3dlckNhc2UoKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGlmIChyZXN1bHQubGVuZ3RoKSByLnB1c2goaXRlbSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIGlmIChmaWx0ZXJCeSA9PT0gJ3RhZ3MnKSB7XG5cdFx0XHRcdC8vIGhhdmUgdG8gaGF2ZSBldmVyeSB0YWcgaW4gZmlsdGVyVGFnc1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBmaWx0ZXJUYWdzLmZpbHRlcihmVGFnID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gaXRlbS50YWdzLmZpbHRlcihpVGFnID0+IHtcblx0XHRcdFx0XHRcdC8vIHdlIGxvd2VyY2FzZSBjaGVjayBqdXN0IGluIGNhc2UgcmlvdCBhcGkgZGF0YVxuXHRcdFx0XHRcdFx0Ly8gaXNuJ3QgdW5pZm9ybWVkIGFuZCBoYXMgc29tZSB0YWdzIHdpdGggd2VpcmQgY2FzaW5nXG5cdFx0XHRcdFx0XHRyZXR1cm4gZlRhZy50b0xvd2VyQ2FzZSgpID09PSBpVGFnLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0fSkubGVuZ3RoO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWYgKHJlc3VsdC5sZW5ndGggPT09IGZpbHRlclRhZ3MubGVuZ3RoKSByLnB1c2goaXRlbSk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHIucHVzaChpdGVtKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIHI7XG5cdFx0fSwgW10pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J2NvbC14cy01IGNvbC1zbS01IGNvbC1tZC01JyArIHRoaXMuc3R5bGVzLml0ZW1EaXNwbGF5V3JhcHBlcn0+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdjb2wteHMtMTIgY29sLXNtLTEyIGNvbC1tZC0xMic+XG5cdFx0XHRcdFx0XHQ8SXRlbVNlYXJjaCBzZWFyY2hWYWx1ZT17dGhpcy5zdGF0ZS5zZWFyY2h9IG9uU2VhcmNoPXt0aGlzLmNoYW5nZVNlYXJjaC5iaW5kKHRoaXMpfSAvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTcgY29sLXNtLTcgY29sLW1kLTcnPlxuXHRcdFx0XHRcdFx0PEl0ZW1DYXRlZ29yaWVzIGNhdGVnb3JpZXM9e3RoaXMuc3RhdGUuY2F0ZWdvcmllc30gb25DYXRlZ29yeUNoZWNrPXt0aGlzLmNoYW5nZUNhdGVnb3JpZXMuYmluZCh0aGlzKX0gLz5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTUgY29sLXNtLTUgY29sLW1kLTUnPlxuXHRcdFx0XHRcdFx0PEl0ZW1EaXNwbGF5IGl0ZW1zPXt0aGlzLmdldEl0ZW1zKCl9IC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbURpc3BsYXlXaWRnZXQ7IiwiLypcblx0SXRlbSBjYXRlZ29yaWVzIGZpbHRlciBmb3IgaXRlbURpc3BsYXlcbiAqL1xuXG5jbGFzcyBJdGVtQ2F0ZWdvcmllcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuaGFuZGxlQ2hhbmdlID0gdGhpcy5oYW5kbGVDaGFuZ2UuYmluZCh0aGlzKTtcblxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ2l0ZW0tY2F0ZWdvcnktd3JhcCcsXG5cdFx0XHRwYXJlbnRDYXRlZ29yeTogJ2NhdGVnb3J5LXdyYXAnLCAvLyB3cmFwcGVyXG5cdFx0XHRzdWJDYXRlZ29yeTogJ3N1Yi1jYXRlZ29yeS13cmFwIHhmb250LXRoaW4nLCAvLyB3cmFwcGVyXG5cdFx0XHRwYXJlbnRDYXRlZ29yeVRpdGxlOiAneGZvbnQgY2F0ZWdvcnktdGl0bGUgdGV4dC1jZW50ZXInLFxuXHRcdH07XG5cdH1cblxuXHQvKlxuXHRcdFdoZW4gYSBzdWIgY2F0ZWdvcnkgaXMgY2xpY2tlZFxuXHQgKi9cblx0aGFuZGxlQ2hhbmdlKGV2ZW50KSB7XG5cdFx0Ly8gW2tleSwgaW5kZXggZm9yIGtleV0gaWU6IGNhdGVnb3JpZXNbJ1N0YXJ0aW5nIExhbmUnXVsxXSBmb3IgTGFuZVxuXHRcdGNvbnN0IGNhdGVnb3J5SWQgPSBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJywnKTtcblx0XHRjb25zdCBjYXRlZ29yeU5hbWUgPSBjYXRlZ29yeUlkWzBdO1xuXHRcdGNvbnN0IHN1YkNhdGVnb3J5ID0gcGFyc2VJbnQoY2F0ZWdvcnlJZFsxXSk7XG5cblx0XHR0aGlzLnByb3BzLm9uQ2F0ZWdvcnlDaGVjayhjYXRlZ29yeU5hbWUsIHN1YkNhdGVnb3J5KTtcblx0fVxuXG5cdC8qXG5cdFx0V2hlbiBhIG1haW4gY2F0ZWdvcnkgaXMgY2xpY2tlZFxuXHQgKi9cblx0aGFuZGxlQ2F0ZWdvcnkoY2F0ZWdvcnlOYW1lKSB7XG5cdFx0dGhpcy5wcm9wcy5vbkNhdGVnb3J5Q2hlY2soY2F0ZWdvcnlOYW1lKTtcblx0fVxuXG5cdHJlbmRlclN1YkNhdGVnb3JpZXMoY2F0ZWdvcmllcywgcGFyZW50Q2F0ZWdvcnkpIHtcblx0XHRyZXR1cm4gY2F0ZWdvcmllcy5tYXAoKGNhdCwgaWR4KSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGtleT17Y2F0Lm5hbWV9IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuc3ViQ2F0ZWdvcnl9PlxuXHRcdFx0XHRcdDxsYWJlbD5cblx0XHRcdFx0XHRcdDxpbnB1dCB0eXBlPSdjaGVja2JveCcgdmFsdWU9e1twYXJlbnRDYXRlZ29yeSwgaWR4XX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlQ2hhbmdlfSBjaGVja2VkPXtjYXQuY2hlY2tlZH0gLz4ge2NhdC5uYW1lfVxuXHRcdFx0XHRcdDwvbGFiZWw+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KTtcblx0XHR9KTtcblx0fVxuXHRcblx0cmVuZGVyQ2F0ZWdvcmllcygpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpcy5wcm9wcy5jYXRlZ29yaWVzKS5tYXAoa2V5ID0+IHtcblx0XHRcdGNvbnN0IHN1YkNhdGVnb3JpZXMgPSB0aGlzLnByb3BzLmNhdGVnb3JpZXNba2V5XTtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtrZXl9IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMucGFyZW50Q2F0ZWdvcnl9PlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMucGFyZW50Q2F0ZWdvcnlUaXRsZX0gb25DbGljaz17dGhpcy5oYW5kbGVDYXRlZ29yeS5iaW5kKHRoaXMsIGtleSl9PntrZXl9PC9zcGFuPlxuXHRcdFx0XHRcdHt0aGlzLnJlbmRlclN1YkNhdGVnb3JpZXMoc3ViQ2F0ZWdvcmllcywga2V5KX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpOyBcblx0XHR9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfT5cblx0XHRcdHt0aGlzLnJlbmRlckNhdGVnb3JpZXMoKX1cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbUNhdGVnb3JpZXM7IiwiLypcblx0RGlzcGxheXMgYWxsIGF2YWlsYWJsZSBvciBmaWx0ZXJlZCAoYnkgc2VhcmNoIG9yIGNhdGVnb3JpZXMpIGl0ZW1zXG4gKi9cblxuaW1wb3J0IEl0ZW1CdXR0b24gZnJvbSAnLi4vLi4vaXRlbUJ1dHRvbic7XG5cbmNsYXNzIEl0ZW1EaXNwbGF5IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ2l0ZW0tZGlzcGxheS13cmFwJ1xuXHRcdH07XG5cdH1cblxuXHRyZW5kZXJJdGVtcygpIHtcblx0XHRyZXR1cm4gdGhpcy5wcm9wcy5pdGVtcy5tYXAoaXRlbSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8SXRlbUJ1dHRvbiBrZXk9e2l0ZW0uaWR9IGl0ZW09e2l0ZW19IC8+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBpZD0naXRlbS1kaXNwbGF5JyBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9PlxuXHRcdFx0e3RoaXMucmVuZGVySXRlbXMoKX1cdFxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtRGlzcGxheTsiLCIvKlxuXHRTZWFyY2ggYmFyIGZvciBpdGVtRGlzcGxheVxuICovXG5cbmNsYXNzIEl0ZW1TZWFyY2ggZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ2lucHV0LWdyb3VwIGlucHV0LWdyb3VwLXNtJyxcblx0XHRcdHNlYXJjaEJhcjogJ2Zvcm0tY29udHJvbCdcblx0XHR9O1xuXHR9XG5cblx0aGFuZGxlU2VhcmNoKGV2ZW50KSB7XG5cdFx0dGhpcy5wcm9wcy5vblNlYXJjaChldmVudC50YXJnZXQudmFsdWUpO1xuXHR9XG5cbiAgLy8gd2h5IGRvIGkgbmVlZCB0byBiaW5kIHRoaXMuaGFuZGxlU2VhcmNoIGFuZCBpbiB0aGUgcGFyZW50IGhhbmRsZXIgZnVuY3Rpb24/IEVTNiBjbGFzc2VzP1xuICAvLyBSZWFjdCBhdXRvIGRpZCB0aGlzIGZvciBtZSB3aXRoIFJlYWN0LmNyZWF0ZUNsYXNzXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfT5cblx0XHRcdDxpbnB1dCBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLnNlYXJjaEJhcn0gdHlwZT0ndGV4dCcgcGxhY2Vob2xkZXI9J1NlYXJjaCBJdGVtcycgb25DaGFuZ2U9e3RoaXMuaGFuZGxlU2VhcmNoLmJpbmQodGhpcyl9IHZhbHVlPXt0aGlzLnByb3BzLnNlYXJjaFZhbHVlfSAvPlxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtU2VhcmNoOyIsImNsYXNzIENoYW1waW9uU2VsZWN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWFyY2hDaGFtcGlvbnMgPSB0aGlzLnNlYXJjaENoYW1waW9ucy5iaW5kKHRoaXMpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0Y2hhbXBpb25Ecm9wRG93bldyYXA6ICdpdGVtLWNoYW1waW9uLWRyb3Bkb3duLXdyYXAnLFxuXHRcdFx0Y2hhbXBpb25Ecm9wRG93bjogJ2l0ZW0tY2hhbXBpb24tZHJvcGRvd24nLFxuXHRcdFx0aGlkZTogJ2hpZGRlbicsXG5cdFx0XHRpbWFnZUNoYW1waW9uOiAnaXRlbS1jaGFtcGlvbi1pbWFnZScsXG5cdFx0XHQvLyB3cmFwcGVyLCBjb3VsZCBiZSBuYW1lIG9yIGlucHV0IGJveFxuXHRcdFx0Y2hhbXBpb25OYW1lOiAnaXRlbS1jaGFtcGlvbi1uYW1lLXdyYXAgeGZvbnQnXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHRzZWFyY2hWYWx1ZTogJycsXG5cdFx0XHRzaG93RHJvcERvd246IGZhbHNlXG5cdFx0fTtcblx0fVxuXG5cdG9uRHJvcERvd24oYm9vbCwgZXZlbnQpIHtcblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblx0XHRjb25zdCBzZXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoYXQuc2V0U3RhdGUoeyBzaG93RHJvcERvd246IGJvb2wgfSk7XG5cdFx0fVxuXG5cdFx0Ly8gaGFja3kgd2F5IHRvIGdldCBtb3VzZSBjbGlja3MgdG8gdHJpZ2dlciBmaXJzdCBiZWZvcmUgb25CbHVyXG5cdFx0aWYgKCFib29sKSB7XG5cdFx0XHRzZXRUaW1lb3V0KHNldCwgMjAwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0KCk7XG5cdFx0fVxuXHR9XG5cblx0c2VhcmNoQ2hhbXBpb25zKGV2ZW50KSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlYXJjaFZhbHVlOiBldmVudC50YXJnZXQudmFsdWUgfSk7XG5cdH1cblx0XG5cdC8qIFxuXHRcdFdoZW4gdXNlciBwcmVzc2VzIGVudGVyLCB3ZSBuZWVkIHRvIHZlcmlmeSBpZiB0aGUgY2hhbXBpb24gYWN0dWFsbHkgZXhpc3RzXG5cdFx0RG8gbm90aGluZyBpZiBpdCBkb2VzIG5vdFxuXHQqL1xuXHRoYW5kbGVTdWJtaXQoZXZlbnQpIHtcblx0XHRpZiAoZXZlbnQud2hpY2ggPT09IDEzKSB7IC8vIGVudGVyXG5cdFx0XHRjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldC52YWx1ZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y29uc3QgY2hhbXAgPSBDaGFtcGlvbkRhdGEuZmlsdGVyKGNoYW1waW9uID0+IHtcblx0XHRcdFx0cmV0dXJuIGNoYW1waW9uLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gaW5wdXQgfHwgY2hhbXBpb24ucmlvdEtleS50b0xvd2VyQ2FzZSgpID09PSBpbnB1dDtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoY2hhbXAubGVuZ3RoKSB7XG5cdFx0XHRcdHRoaXMub25DaGFtcGlvblNlbGVjdChjaGFtcFswXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0b25DaGFtcGlvblNlbGVjdChjaGFtcGlvbikge1xuXHRcdHRoaXMucHJvcHMuaGFuZGxlQ2hhbXBpb25TZWxlY3QoY2hhbXBpb24pO1xuXHR9XG5cblx0cmVuZGVyU2VhcmNoUmVzdWx0c0l0ZW1zKCkge1xuXHRcdGNvbnN0IHNlYXJjaFRlcm0gPSB0aGlzLnN0YXRlLnNlYXJjaFZhbHVlLnRvTG93ZXJDYXNlKCk7XG5cdFx0bGV0IGNoYW1waW9ucyA9IENoYW1waW9uRGF0YTtcblxuXHRcdC8vIGZpcnN0IGZpbHRlciBieSBzZWFyY2hcdFx0XG5cdFx0aWYgKHNlYXJjaFRlcm0pIHtcblx0XHRcdGNoYW1waW9ucyA9IENoYW1waW9uRGF0YS5maWx0ZXIoY2hhbXAgPT4ge1xuXHRcdFx0XHRjb25zdCBuYW1lID0gY2hhbXAubmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRjb25zdCBrZXluYW1lID0gY2hhbXAucmlvdEtleS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRyZXR1cm4gbmFtZS5pbmRleE9mKHNlYXJjaFRlcm0pID09PSAwIHx8IGtleW5hbWUuaW5kZXhPZihzZWFyY2hUZXJtKSA9PSAwO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBieSBuYW1lIC8gZmlyc3QgbGV0dGVyIG9mIG5hbWVcblx0XHRjaGFtcGlvbnMuc29ydChmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRjb25zdCBhYSA9IGEubmFtZVswXS5jaGFyQ29kZUF0KCk7XG5cdFx0XHRjb25zdCBiYiA9IGIubmFtZVswXS5jaGFyQ29kZUF0KCk7XG5cdFx0XHRpZiAoYWEgPiBiYikge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSBpZiAoYmIgPiBhYSkge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRcblx0XHQvLyB3ZSBvbmx5IHNob3cgdGhlIGZpcnN0IDEwIG9mIHRoZSByZXN1bHRzXG5cdFx0bGV0IGNoYW1waW9uc2xpbWl0ID0gY2hhbXBpb25zLnNsaWNlKDAsIDEwKTtcblxuXHRcdHJldHVybiBjaGFtcGlvbnNsaW1pdC5tYXAoY2hhbXBpb24gPT4ge1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0PGxpIGtleT17Y2hhbXBpb24ucmlvdElkfSBvbkNsaWNrPXt0aGlzLm9uQ2hhbXBpb25TZWxlY3QuYmluZCh0aGlzLCBjaGFtcGlvbil9PlxuXHRcdFx0XHRcdDxpbWcgc3JjPXsnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyBjaGFtcGlvbi5yaW90S2V5ICsgJy5wbmcnfSAvPlxuXHRcdFx0XHRcdDxzcGFuPntjaGFtcGlvbi5uYW1lfTwvc3Bhbj5cblx0XHRcdFx0PC9saT5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXJTZWFyY2hSZXN1bHRzKCkge1xuXHRcdGxldCBjbHMgPSB0aGlzLnN0eWxlcy5jaGFtcGlvbkRyb3BEb3duV3JhcDtcblx0XHRpZiAoIXRoaXMuc3RhdGUuc2hvd0Ryb3BEb3duKSB7XG5cdFx0XHRjbHMgKz0gJyAnICsgdGhpcy5zdHlsZXMuaGlkZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9e2Nsc30+XG5cdFx0XHRcdDx1bCBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNoYW1waW9uRHJvcERvd259PlxuXHRcdFx0XHRcdHt0aGlzLnJlbmRlclNlYXJjaFJlc3VsdHNJdGVtcygpfVxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRsZXQgaW1hZ2VVcmwgPSAnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyB0aGlzLnByb3BzLmNoYW1waW9uLnJpb3RLZXkgKyAnLnBuZyc7XG5cdFx0bGV0IGltYWdlQ2hhbXBpb24gPSB0aGlzLnN0eWxlcy5pbWFnZUNoYW1waW9uO1xuXG5cdFx0bGV0IHJlbmRlclBpY2tlck9yQ2hhbXBpb24gPSAoPGgyPnt0aGlzLnByb3BzLmNoYW1waW9uLm5hbWV9PC9oMj4pO1xuXG5cdFx0aWYgKCF0aGlzLnByb3BzLmNoYW1waW9uLnJpb3RJZCkge1xuXHRcdFx0aW1hZ2VVcmwgPSAnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vNS4yLjEvaW1nL3VpL2NoYW1waW9uLnBuZyc7XG5cdFx0XHRpbWFnZUNoYW1waW9uID0gJ2RlZmF1bHQtY2hhbXBpb24nXG5cdFx0XHQvLyByZW5kZXIgdGhlIGNoYW1waW9uIHBpY2tlclxuXHRcdFx0cmVuZGVyUGlja2VyT3JDaGFtcGlvbiA9IChcblx0XHRcdFx0XHQ8ZGl2IG9uQmx1cj17dGhpcy5vbkRyb3BEb3duLmJpbmQodGhpcywgZmFsc2UpfT5cblx0XHRcdFx0XHQ8aW5wdXQgdHlwZT0ndGV4dCcgcGxhY2Vob2xkZXI9J1BpY2sgYSBDaGFtcGlvbiBmb3IgdGhpcyBidWlsZCcgdmFsdWU9e3RoaXMuc3RhdGUuc2VhcmNoVmFsdWV9IG9uQ2hhbmdlPXt0aGlzLnNlYXJjaENoYW1waW9uc30gb25Gb2N1cz17dGhpcy5vbkRyb3BEb3duLmJpbmQodGhpcywgdHJ1ZSl9IG9uS2V5VXA9e3RoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyl9IG9uS2V5RG93bj17dGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKX0gLz5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJTZWFyY2hSZXN1bHRzKCl9XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0PGltZyBjbGFzc05hbWU9e2ltYWdlQ2hhbXBpb259IHNyYz17aW1hZ2VVcmx9IC8+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5jaGFtcGlvbk5hbWV9PlxuXHRcdFx0XHR7cmVuZGVyUGlja2VyT3JDaGFtcGlvbn1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ2hhbXBpb25TZWxlY3Q7IiwiY2xhc3MgQ3JlYXRlQmxvY2sgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGl0ZW1CbG9jazogJ2l0ZW0tYmxvY2snLFxuXHRcdFx0aXRlbV9ibG9ja19hZGQ6ICdpdGVtLXNldC1hZGQtYmxvY2snXG5cdFx0fVxuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5wcm9wcy5hZGREcmFnKHRoaXMucmVmcy5kcmFnLmdldERPTU5vZGUoKSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IHJlZj0nZHJhZycgaWQ9J2NyZWF0ZS1ibG9jaycgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy5pdGVtQmxvY2t9IG9uQ2xpY2s9e3RoaXMucHJvcHMuaGFuZGxlckNyZWF0ZX0+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuaXRlbV9ibG9ja19hZGR9PlxuXHRcdFx0XHREcmFnIEl0ZW1zIEhlcmUgdG8gQ3JlYXRlIGEgTmV3IEJsb2NrXG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cdFxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBDcmVhdGVCbG9jaztcdFxuIiwiaW1wb3J0IENoYW1waW9uU2VsZWN0IGZyb20gJy4vY2hhbXBpb25TZWxlY3QnO1xuaW1wb3J0IEl0ZW1CbG9ja3MgZnJvbSAnLi9pdGVtQmxvY2tzJztcbmltcG9ydCBJdGVtU2V0VXBsb2FkIGZyb20gJy4vdXBsb2FkJztcbmltcG9ydCBDcmVhdGVCbG9jayBmcm9tICcuL2NyZWF0ZUJsb2NrJztcbmltcG9ydCBNYXBTZWxlY3QgZnJvbSAnLi9tYXBTZWxlY3QnO1xuaW1wb3J0IFNoYXJlIGZyb20gJy4uLy4uL3NoYXJlJztcbmltcG9ydCBEb3dubG9hZCBmcm9tICcuLi8uLi9kb3dubG9hZCc7XG5cbnZhciBkcmFndWxhID0gcmVxdWlyZSgnLi4vLi4vZHJhZ3VsYS9yZWFjdC1kcmFndWxhJyk7XG5cbmNsYXNzIEl0ZW1TZXRXaWRnZXQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHRpdGVtU2V0V3JhcHBlcjogJycsXG5cdFx0XHRpdGVtQmxvY2s6ICdpdGVtLWJsb2NrJyxcblx0XHRcdGl0ZW1fYmxvY2tfYWRkOiAnaXRlbS1zZXQtYWRkLWJsb2NrJyxcblx0XHRcdGJ1dHRvblNhdmU6ICdidG4gYnRuLWRlZmF1bHQnXG5cdFx0fTtcblxuXHRcdHRoaXMuc3RhdGUgPSBpdGVtU2V0U3RvcmUuZ2V0QWxsKCk7XG5cblx0XHR0aGlzLnRva2VuID0gMDtcblx0XHR0aGlzLnRva2VuSWQgPSAwO1xuXG5cdFx0dGhpcy5kciA9IGRyYWd1bGEoe1xuXHRcdFx0Y29weTogZmFsc2Vcblx0XHR9KTtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMudG9rZW4gPSBpdGVtU2V0U3RvcmUuYWRkTGlzdGVuZXIodGhpcy5fb25DaGFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy50b2tlblNhdmVTdGF0dXMgPSBhcHBTdG9yZS5hZGRMaXN0ZW5lcignc2F2ZVN0YXR1cycsIHRoaXMuX29uU2F2ZS5iaW5kKHRoaXMpKTtcblxuXHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuZHIuY29udGFpbmVycy5wdXNoKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpdGVtLWRpc3BsYXknKSk7XG5cblx0XHR0aGlzLmRyLm9uKCdkcm9wJywgZnVuY3Rpb24oZWwsIHRhcmdldCwgc3JjKSB7XG5cdFx0XHRjb25zdCBpZCA9IGVsLmdldEF0dHJpYnV0ZSgnZGF0YS1pdGVtLWlkJyk7XG5cdFx0XHRjb25zdCBpZHggPSB0YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWJsb2NrLWlkeCcpO1xuXHRcdFx0aWYgKChpZHggPT09IDAgfHwgaWR4ICkgJiYgc3JjLmlkID09ICdpdGVtLWRpc3BsYXknICYmIHRhcmdldC5pZCAhPSAnaXRlbS1kaXNwbGF5Jykge1xuXHRcdFx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmFkZF9pdGVtc2V0X2l0ZW0oaWR4LCBpZCkpO1xuXHRcdFx0fSBlbHNlIGlmIChzcmMuaWQgPT0gJ2l0ZW0tZGlzcGxheScgJiYgdGFyZ2V0LmlkID09J2NyZWF0ZS1ibG9jaycpIHtcblx0XHRcdFx0dGhhdC5vbkNyZWF0ZUJsb2NrKFtcblx0XHRcdFx0XHR7IGlkOiBpZCwgY291bnQ6IDEgfVxuXHRcdFx0XHRdKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdGl0ZW1TZXRTdG9yZS5yZW1vdmVMaXN0ZW5lcignJywgdGhpcy50b2tlbik7XG5cdFx0YXBwU3RvcmUucmVtb3ZlTGlzdGVuZXIoJ3NhdmVTdGF0dXMnLCB0aGlzLnRva2VuU2F2ZVN0YXR1cyk7XG5cdH1cblxuXHRfb25TYXZlKCkge1xuXHRcdGNvbnN0IHNhdmVTdGF0dXMgPSBhcHBTdG9yZS5nZXRBbGwoKS5zYXZlU3RhdHVzO1xuXHRcdC8vIGNoZWNrIGlmIHRoZSBzYXZlIHdhcyBzdWNjZXNzZnVsICYgaWYgaXQgd2FzIHJlYWxseSBhIHNhdmUgZXZlbnRcblx0XHRpZiAoc2F2ZVN0YXR1cyAmJiBzYXZlU3RhdHVzLmlkICYmIHNhdmVTdGF0dXMubXNnID09PSAnb2snKSB7XG5cdFx0XHR0aGlzLmNvbnRleHQucm91dGVyLnRyYW5zaXRpb25UbygnZWRpdCcsIHtpZDogc2F2ZVN0YXR1cy5pZH0pO1xuXHRcdH1cblx0fVxuXG5cdF9vbkNoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoZGF0YSk7XG5cdH1cblxuXHRhZGREcmFnQ29udGFpbmVyKGVsKSB7XG5cdFx0dGhpcy5kci5jb250YWluZXJzLnB1c2goZWwpO1xuXHR9XG5cblx0Y2hhbmdlVGl0bGUoZXZlbnQpIHtcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnVwZGF0ZV9pdGVtc2V0X3RpdGxlKGV2ZW50LnRhcmdldC52YWx1ZSkpO1xuXHR9XG5cblx0Y2hhbmdlVHlwZShibG9ja0lkeCwgdHh0KSB7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy51cGRhdGVfaXRlbXNldF9ibG9ja190eXBlKGJsb2NrSWR4LCB0eHQpKTtcblx0fVxuXG5cdG9uQ3JlYXRlQmxvY2soaXRlbXMsIGV2ZW50KSB7XG5cdFx0dmFyIGkgPSBbXTtcblx0XHRpZiAoIWV2ZW50KSBpID0gaXRlbXM7XG5cdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5jcmVhdGVfaXRlbXNldF9ibG9jayh7XG5cdFx0XHR0eXBlOiAnJyxcblx0XHRcdHJlY01hdGg6IGZhbHNlLFxuXHRcdFx0bWluU3VtbW9uZXJMZXZlbDogLTEsXG5cdFx0XHRtYXhTdW1tbW9uZXJMZXZlbDogLTEsXG5cdFx0XHRzaG93SWZTdW1tb25lclNwZWxsOiAnJyxcblx0XHRcdGhpZGVJZlN1bW1vbmVyU3BlbGw6ICcnLFxuXHRcdFx0aXRlbXM6IGlcblx0XHR9KSk7XG5cdH1cblxuXHRvblJlbW92ZUJsb2NrKGlkeCkge1xuXHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuZGVsZXRlX2l0ZW1zZXRfYmxvY2soaWR4KSk7XG5cdH1cblx0XG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9eydjb2wteHMtNiBjb2wtc20tNiBjb2wtbWQtNicgKyB0aGlzLnN0eWxlcy5pdGVtU2V0V3JhcHBlcn0+XG5cdFx0XHRcblx0XHRcdFx0PFNoYXJlIGlkPXt0aGlzLnN0YXRlLmlkfSBzaG93PXt0aGlzLnByb3BzLnNob3dTaGFyZX0gLz5cblx0XHRcdFx0PERvd25sb2FkIHNob3c9e3RoaXMucHJvcHMuc2hvd0Rvd25sb2FkfSBpZD17dGhpcy5zdGF0ZS5pZH0gZGF0YT17dGhpcy5zdGF0ZS5pdGVtc2V0fSAvPlxuXG5cdFx0XHRcdDxJdGVtU2V0VXBsb2FkIHNob3c9e3RoaXMuc3RhdGUuc2hvd0ZpbGVVcGxvYWR9IC8+XG5cblx0XHRcdFx0PGJyIC8+XG5cblx0XHRcdFx0PENoYW1waW9uU2VsZWN0IGhhbmRsZUNoYW1waW9uU2VsZWN0PXt0aGlzLnByb3BzLmhhbmRsZUNoYW1waW9uU2VsZWN0fSBhcGlWZXJzaW9uPXt0aGlzLnByb3BzLmFwaVZlcnNpb259IGNoYW1waW9uPXt0aGlzLnByb3BzLmNoYW1waW9ufSAvPlxuXG5cblx0XHRcdFx0PE1hcFNlbGVjdCAvPlxuXG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0XHQ8aW5wdXQgY2xhc3NOYW1lPSdmb3JtLWNvbnRyb2wnIHR5cGU9J3RleHQnIHZhbHVlPXt0aGlzLnN0YXRlLml0ZW1zZXQudGl0bGV9IHBsYWNlaG9sZGVyPSdOYW1lIHlvdXIgaXRlbSBzZXQgYnVpbGQnIG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVRpdGxlLmJpbmQodGhpcyl9IC8+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8YnIgLz5cblxuXHRcdFx0XHQ8SXRlbUJsb2NrcyBhZGREcmFnPXt0aGlzLmFkZERyYWdDb250YWluZXIuYmluZCh0aGlzKX0gYmxvY2tzPXt0aGlzLnN0YXRlLml0ZW1zZXQuYmxvY2tzfSBoYW5kbGVCbG9ja1R5cGU9e3RoaXMuY2hhbmdlVHlwZS5iaW5kKHRoaXMpfSBoYW5kbGVSZW1vdmVCbG9jaz17dGhpcy5vblJlbW92ZUJsb2NrLmJpbmQodGhpcyl9IC8+XG5cblx0XHRcdFx0PENyZWF0ZUJsb2NrIGFkZERyYWc9e3RoaXMuYWRkRHJhZ0NvbnRhaW5lci5iaW5kKHRoaXMpfSBoYW5kbGVyQ3JlYXRlPXt0aGlzLm9uQ3JlYXRlQmxvY2suYmluZCh0aGlzKX0gLz5cblxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbkl0ZW1TZXRXaWRnZXQuY29udGV4dFR5cGVzID0ge1xuXHRyb3V0ZXI6IFJlYWN0LlByb3BUeXBlcy5mdW5jXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1TZXRXaWRnZXQ7IiwiaW1wb3J0IEl0ZW1CdXR0b24gZnJvbSAnLi4vLi4vaXRlbUJ1dHRvbic7XG5cbmNsYXNzIEl0ZW1CbG9jayBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdGl0ZW1CbG9jazogJ2l0ZW0tYmxvY2snLFxuXHRcdFx0aXRlbV9ibG9ja190aXRsZTogJ2l0ZW0tc2V0LWJsb2NrLXRpdGxlJyxcblx0XHRcdGl0ZW1faWNvbl9ibG9jazogJ2l0ZW0tc2V0LWJ1dHRvbi1ibG9jaycsXG5cdFx0XHRpdGVtX2ljb25fY291bnQ6ICdpdGVtLXNldC1idXR0b24tYmxvY2stY291bnQnLFxuXHRcdH07XG5cdH1cblx0XG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHRoaXMucHJvcHMuYWRkRHJhZyh0aGlzLnJlZnMuZHJhZy5nZXRET01Ob2RlKCkpO1xuXHR9XG5cblx0Y2hhbmdlVHlwZShpZCwgaWR4LCBldmVudCkge1xuXHRcdGNvbnNvbGUubG9nKGlkKTtcblx0XHR0aGlzLnByb3BzLmhhbmRsZUJsb2NrVHlwZShpZHgsIGV2ZW50LnRhcmdldC52YWx1ZSk7XG5cdH1cblxuXHRvblJlbW92ZUJsb2NrKGlkeCkge1xuXHRcdHRoaXMucHJvcHMuaGFuZGxlUmVtb3ZlQmxvY2soaWR4KTtcblx0fVxuXG5cdHJlbmRlckl0ZW1zKGl0ZW1zKSB7XG5cdFx0cmV0dXJuIGl0ZW1zLm1hcCgoaXRlbSwgaWR4KSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGtleT17aXRlbS5pZCArICctJyArIGlkeH0gY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5pdGVtX2ljb25fYmxvY2t9PlxuXHRcdFx0XHRcdDxJdGVtQnV0dG9uIGl0ZW1JZD17aXRlbS5pZH0gLz5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLml0ZW1faWNvbl9jb3VudH0+e2l0ZW0uY291bnR9PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGNsYXNzTmFtZT17J3JvdyAnICsgdGhpcy5zdHlsZXMuaXRlbUJsb2NrfT5cblxuXHRcdFx0PGRpdiBjbGFzc05hbWU9eydyb3cgJyArIHRoaXMuc3R5bGVzLml0ZW1fYmxvY2tfdGl0bGV9PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTEwIGNvbC1zbS0xMCBjb2wtbWQtMTAnPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdpbnB1dC1ncm91cCBpbnB1dC1ncm91cC1zbSc+XG5cdFx0XHRcdFx0XHQ8aW5wdXQgY2xhc3NOYW1lPSdmb3JtLWNvbnRyb2wnIHR5cGU9J3RleHQnIHZhbHVlPXt0aGlzLnByb3BzLmJsb2NrLnR5cGV9IG9uQ2hhbmdlPXt0aGlzLmNoYW5nZVR5cGUuYmluZCh0aGlzLCB0aGlzLnByb3BzLmJsb2NrLmlkLCB0aGlzLnByb3BzLmlkeCl9IHBsYWNlaG9sZGVyPSdleHBsYWluIHRoaXMgaXRlbSByb3cnIC8+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0naW5wdXQtZ3JvdXAtYWRkb24nPlxuXHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTEgY29sLXNtLTEgY29sLW1kLTEnPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cImdseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlXCIgb25DbGljaz17dGhpcy5vblJlbW92ZUJsb2NrLmJpbmQodGhpcywgdGhpcy5wcm9wcy5pZHgpfT48L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdyb3cnPlxuXHRcdFx0XHQ8ZGl2IHJlZj0nZHJhZycgZGF0YS1ibG9jay1pZHg9e3RoaXMucHJvcHMuaWR4fSBjbGFzc05hbWU9J2NvbC14cy0xMiBjb2wtc20tMTIgY29sLW1kLTEyIGRyYWctY29udGFpbmVyJz5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJJdGVtcyh0aGlzLnByb3BzLmJsb2NrLml0ZW1zKX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBJdGVtQmxvY2s7IiwiaW1wb3J0IEl0ZW1CbG9jayBmcm9tICcuL2l0ZW1CbG9jayc7XG5cbmNsYXNzIEl0ZW1CbG9ja3MgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0Y29uc3QgcmVuZGVyQmxvY2tzID0gdGhpcy5wcm9wcy5ibG9ja3MubWFwKChibG9jaywgaWR4KSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8SXRlbUJsb2NrIGtleT17YmxvY2suaWQgKyAnLScgKyBpZHh9IGJsb2NrPXtibG9ja30gaWR4PXtpZHh9IGFkZERyYWc9e3RoaXMucHJvcHMuYWRkRHJhZ30gaGFuZGxlQmxvY2tUeXBlPXt0aGlzLnByb3BzLmhhbmRsZUJsb2NrVHlwZX0gaGFuZGxlUmVtb3ZlQmxvY2s9e3RoaXMucHJvcHMuaGFuZGxlUmVtb3ZlQmxvY2t9IC8+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXY+XG5cdFx0XHRcdHtyZW5kZXJCbG9ja3N9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXRlbUJsb2NrcztcdFxuIiwiY2xhc3MgTWFwU2VsZWN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0XHRQaWNrIGZvciB3aGF0IG1hcHMgaGVyZVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1hcFNlbGVjdDsiLCJjbGFzcyBJdGVtU2V0VXBsb2FkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHRlcnJEaXNwbGF5OiAndXBsb2FkLWVycm9yJ1xuXHRcdH1cblxuXHRcdHRoaXMuaGFuZGxlVXBsb2FkID0gdGhpcy5oYW5kbGVVcGxvYWQuYmluZCh0aGlzKTtcblx0XHR0aGlzLmhhbmRsZVN1Ym1pdCA9IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyk7XG5cblx0XHR0aGlzLmNsZWFyRXJyVGltZXIgPSAwO1xuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHRlcnJvcjogJydcblx0XHR9XG5cdH1cblxuXHR2YWxpZGF0ZVBhcnNlZChwYXJzZWRKc29uKSB7XG5cdFx0Ly8gVE9ETyB2YWxpZGF0ZVxuXHRcdC8vIC4uLlxuXHRcdFxuXHRcdC8vIG9uY2UgdmFsaWRhdGVkIHNhdmUgdG8gc3RvcmVcblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLnVwbG9hZF9pdGVtc2V0KHBhcnNlZEpzb24pKTtcblx0fVxuXG5cdGhhbmRsZUVycm9yKGVyciwgZmlsZW5hbWUpIHtcblx0XHRsZXQgZXJyb3IgPSAnVW5hYmxlIHRvIHBhcnNlIHRoaXMgZmlsZSwgaXQgbWF5YmUgbm90IHZhbGlkJztcblx0XHRzd2l0Y2ggKGVyci50b1N0cmluZygpKSB7XG5cdFx0XHRjYXNlICd0b29iaWcnOlxuXHRcdFx0XHRlcnJvciA9ICdUaGUgZmlsZVxcJ3Mgc2l6ZSBpcyB0b28gYmlnIGFuZCBtYXkgbm90IGJlIHZhbGlkJ1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHsgZXJyb3I6IGZpbGVuYW1lICsgJzogJyArIGVycm9yIH0pO1xuXHR9XG5cblx0Y2xlYXJFcnJvcigpIHtcblx0XHRpZiAodGhpcy5jbGVhckVyclRpbWVyKSB7XG5cdFx0XHRjbGVhckludGVydmFsKHRoaXMuY2xlYXJFcnJUaW1lcik7XG5cdFx0fVxuXHRcdHRoaXMuc2V0U3RhdGUoeyBlcnJvcjogJycgfSk7XG5cdH1cblxuXHRoYW5kbGVVcGxvYWQoZXZlbnQpIHtcblx0XHRjb25zdCB0aGF0ID0gdGhpcztcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICB2YXIgZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlc1swXTtcblxuICAgIGlmIChmaWxlLnNpemUgPiAxNTAwMCkge1xuICAgIFx0dGhpcy5oYW5kbGVFcnJvcigndG9vYmlnJywgZmlsZS5uYW1lKTtcbiAgICBcdHJldHVybjtcbiAgICB9XG5cbiAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24odXBsb2FkKSB7XG4gICAgXHRsZXQgcGFyc2VkO1xuICAgIFx0bGV0IGVyciA9ICcnO1xuXHQgICAgdHJ5IHtcblx0XHQgICAgcGFyc2VkID0gSlNPTi5wYXJzZSh1cGxvYWQudGFyZ2V0LnJlc3VsdClcblx0XHQgIH0gY2F0Y2goZSkge1xuXHRcdCAgXHRlcnIgPSBlO1xuXHRcdCAgfVxuXHRcdCAgaWYgKGVyciB8fCAhcGFyc2VkKSB7XG5cdFx0ICBcdHRoYXQuaGFuZGxlRXJyb3IoZXJyLCBmaWxlLm5hbWUpO1xuXHRcdCAgfSBlbHNlIHtcblx0XHQgIFx0dGhhdC52YWxpZGF0ZVBhcnNlZChwYXJzZWQpO1xuXHRcdCAgfVxuXHRcdCAgY29uc3QgZWwgPSBSZWFjdC5maW5kRE9NTm9kZSh0aGF0LnJlZnMuaW5wdXRFbGVtKTtcblx0XHQgIGlmIChlbCkgZWwudmFsdWUgPSAnJztcbiAgICB9XG4gIFx0cmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gIH1cblxuXHRoYW5kbGVTdWJtaXQoZXZlbnQpIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdC8vIGRvbid0IHNob3cgdGhlIHVwbG9hZCBmb3JtIGlmIHVzZXIgYWxyZWFkeSB1cGxvYWRlZFxuXHRcdGlmICghdGhpcy5wcm9wcy5zaG93KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0bGV0IGVycm9yO1xuXHRcdC8vIGZhZGUgYXdheSBlcnJvcnNcblx0XHRpZiAodGhpcy5zdGF0ZS5lcnJvcikge1xuXHRcdFx0Ly8gaWYgdGhlcmUncyBhIHByZXZpb3VzIHRpbWVyLCBzdG9wIGl0IGZpcnN0XG5cdFx0XHRpZiAodGhpcy5jbGVhckVyclRpbWVyKSB7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwodGhpcy5jbGVhckVyclRpbWVyKTtcblx0XHRcdH1cblx0XHRcdGVycm9yID0gKDxzcGFuIGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuZXJyRGlzcGxheX0gb25DbGljaz17dGhpcy5jbGVhckVycm9yLmJpbmQodGhpcyl9Pnt0aGlzLnN0YXRlLmVycm9yfTwvc3Bhbj4pO1xuXHRcdFx0dGhpcy5jbGVhckVyclRpbWVyID0gc2V0VGltZW91dCh0aGlzLmNsZWFyRXJyb3IuYmluZCh0aGlzKSwgMjUwMCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXY+XG5cdFx0XHQ8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXR9IGVuY1R5cGU9XCJtdWx0aXBhcnQvZm9ybS1kYXRhXCI+XG5cdFx0XHRcdDxpbnB1dCByZWY9J2lucHV0RWxlbScgdHlwZT0nZmlsZScgYWNjZXB0PScuanNvbicgb25DaGFuZ2U9e3RoaXMuaGFuZGxlVXBsb2FkfSAvPlxuXHRcdFx0PC9mb3JtPlxuXHRcdFx0e2Vycm9yfVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1TZXRVcGxvYWQ7XHRcbiIsImNsYXNzIFNhdmVSZXN1bHQgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHR3cmFwcGVyOiAncG9wdXAtd3JhcHBlcicsXG5cdFx0XHRjb250YWluZXI6ICdwb3B1cC1jb250YWluZXInLFxuXG5cdFx0XHRjb21wb25lbnRDb250YWluZXI6ICdzYXZlLXJlc3VsdC1jb250YWluZXInLFxuXHRcdFx0aWNvbjogJ3NhdmUtcmVzdWx0LWljb24nLFxuXHRcdFx0bWVzc2FnZTogJ3NhdmUtcmVzdWx0LW1lc3NhZ2UnLFxuXHRcdFx0cmVtb3ZlQnV0dG9uOiAnc2F2ZS1yZXN1bHQtYnV0dG9uJyxcblx0XHRcdGdyZWVuOiAnZm9udC1ncmVlbicsXG5cdFx0XHRyZWQ6ICdmb250LXJlZCdcblx0XHR9O1xuXHR9XG5cblx0cmVtb3ZlUG9wdXAoYnV0dG9uQ2xpY2ssIGV2ZW50KSB7XG5cdFx0Y29uc3QgcmVtb3ZlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmdvdF9zYXZlX3N0YXR1cygpKTtcblx0XHR9XG5cblx0XHRpZiAoYnV0dG9uQ2xpY2sudGFyZ2V0KSBldmVudCA9IGJ1dHRvbkNsaWNrO1xuXHRcdGlmIChidXR0b25DbGljayA9PT0gdHJ1ZSkge1xuXHRcdFx0cmVtb3ZlKCk7XHRcdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSA9PT0gdGhpcy5zdHlsZXMud3JhcHBlcikge1xuXHRcdFx0XHRyZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG5cdHJlbmRlcigpIHtcblx0XHRpZiAoIXRoaXMucHJvcHMucmVzdWx0KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRjb25zdCByZXN1bHQgPSB0aGlzLnByb3BzLnJlc3VsdDtcblx0XHRsZXQgbWVzc2FnZSA9ICcnO1xuXG5cdFx0bGV0IGdseXBoID0gJ2dseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlJztcblx0XHRsZXQgY29sb3IgPSB0aGlzLnN0eWxlcy5yZWQ7XG5cdFx0aWYgKHJlc3VsdC5tc2cgPT09ICdvaycpIHtcblx0XHRcdGNvbG9yID0gdGhpcy5zdHlsZXMuZ3JlZW47XG5cdFx0XHRnbHlwaCA9ICdnbHlwaGljb24gZ2x5cGhpY29uLW9rJztcblx0XHRcdG1lc3NhZ2UgPSAnWW91ciBJdGVtIEJ1aWxkIGhhcyBiZWVuIHNhdmVkLiBIZWFkIG92ZXIgdG8gRG93bmxvYWQgdG8gZ2V0IGl0IG9uIHlvdXIgY29tcHV0ZXIsIG9yIFNoYXJlIHRvIHNob3cgb3RoZXJzIHlvdXIgYW1hemluZyBidWlsZCEnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlID0gJ1lvdXIgSXRlbSBCdWlsZCBpcyBtaXNzaW5nIHNvbWV0aGluZywgKG1vcmUgZGV0YWlscyB0byBjb21lKSc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfSBvbkNsaWNrPXt0aGlzLnJlbW92ZVBvcHVwLmJpbmQodGhpcywgZmFsc2UpfT5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNvbnRhaW5lcn0+XG5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmNvbXBvbmVudENvbnRhaW5lcn0+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9e2NvbG9yICsgJyAnICsgdGhpcy5zdHlsZXMuaWNvbn0+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9e2dseXBofT48L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMubWVzc2FnZX0+XG5cdFx0XHRcdFx0XHR7bWVzc2FnZX1cblx0XHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5yZW1vdmVCdXR0b259PlxuXHRcdFx0XHRcdFx0PGJ1dHRvbiBvbkNsaWNrPXt0aGlzLnJlbW92ZVBvcHVwLmJpbmQodGhpcywgdHJ1ZSl9PkdvdCBpdDwvYnV0dG9uPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBTYXZlUmVzdWx0OyIsImNsYXNzIERvd25sb2FkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHdyYXBwZXI6ICdwb3B1cC13cmFwcGVyJyxcblx0XHRcdGNvbnRhaW5lcjogJ3BvcHVwLWNvbnRhaW5lcicsXG5cblx0XHRcdGlucHV0SnNvbjogJ2lucHV0SnNvbicsXG5cdFx0fVxuXHR9XG5cblx0cmVtb3ZlU2hvdyhidXR0b25DbGljaywgZXZlbnQpIHtcblx0XHRjb25zdCByZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuYXBwX2hpZGVfcG9wdXAoKSk7XG5cdFx0fVxuXG5cdFx0aWYgKGJ1dHRvbkNsaWNrLnRhcmdldCkgZXZlbnQgPSBidXR0b25DbGljaztcblx0XHRpZiAoYnV0dG9uQ2xpY2sgPT09IHRydWUpIHtcblx0XHRcdHJlbW92ZSgpO1x0XHRcdFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldC5jbGFzc05hbWUgPT09IHRoaXMuc3R5bGVzLndyYXBwZXIpIHtcblx0XHRcdFx0cmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmVuZGVyRG93bmxvYWQoanNvbikge1xuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBjbGFzc05hbWU9J3Jvdyc+XG5cdFx0XHQ8aDMgY2xhc3NOYW1lPSd4Zm9udC10aGluJz5Eb3dubG9hZDwvaDM+XG5cdFx0XHQ8aHIgLz5cblx0XHRcdDxwPllvdSBjYW4gZ2V0IHRoaXMgaXRlbSBidWlsZCB0aHJvdWdoIHR3byBtZXRob2RzLCBvbmUgaXMgYnkgZG93bmxvYWRpbmcgaXQgPGEgaHJlZj17Jy9kb3dubG9hZC8nICsgdGhpcy5wcm9wcy5pZCArICcuanNvbid9PmhlcmU8L2E+LjwvcD5cblx0XHRcdDxwPlxuXHRcdFx0XHRPciB0aGUgb3RoZXIgbWV0aG9kIGlzIGNyZWF0aW5nIGEgZmlsZSB3aXRoIHRoZSBuYW1lOlxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGk+e3RoaXMucHJvcHMuaWR9Lmpzb248L2k+XG5cdFx0XHQ8L3A+XG5cdFx0XHQ8cD5cblx0XHRcdFx0VGhlbiBjb3B5IGFuZCBwYXN0ZSB0aGUgYmVsb3cgY29kZSBpbnRvIHRoZSBmaWxlIGFuZCBzYXZlLlxuXHRcdFx0PC9wPlxuXHRcdFx0PHRleHRhcmVhIHJlYWRPbmx5IHZhbHVlPXtqc29ufSBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmlucHV0SnNvbn0+PC90ZXh0YXJlYT5cblx0XHRcdDxociAvPlxuXHRcdFx0PHA+XG5cdFx0XHRcdEFmdGVyIHlvdSBhcmUgZG9uZSB3aXRoIGVpdGhlciBtZXRob2QsIG1vdmUgdGhlIGZpbGUgaW50byB0aGUgYXBwcm9wcmlhdGUgY2hhbXBpb24gZm9sZGVyIHdoZXJlIExlYWd1ZSBPZiBMZWdlbmRzIGlzIGluc3RhbGxlZC5cblx0XHRcdDwvcD5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cblx0cmVuZGVyRXJyKGVycikge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblx0XHRcdFx0PGgzPlRoZXJlIHdhcyBhbiBlcnJvcjwvaDM+XG5cdFx0XHRcdDxociAvPlxuXHRcdFx0XHQ8cD5UaGlzIGlzIG1vc3QgbGlrZWx5IGEgYnVnLiBSZXBvcnQgaXQgaWYgcG9zc2libGUgKHNlZSBBYm91dCBzZWN0aW9uKS48L3A+XG5cblx0XHRcdFx0PHA+VGhlIHNwZWNpZmljIGVycm9yIG1lc3NhZ2UgaXM6IHtlcnIudG9TdHJpbmcoKX08L3A+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zaG93KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRsZXQganNvbiwganNvbkVycjtcblx0XHR0cnkge1xuXHRcdFx0anNvbiA9IEpTT04uc3RyaW5naWZ5KHRoaXMucHJvcHMuZGF0YSk7XG5cdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRqc29uRXJyID0gZTtcblx0XHR9XG5cblx0XHRsZXQgbWVzc2FnZTtcblx0XHRpZiAoanNvbkVycikge1xuXHRcdFx0bWVzc2FnZSA9IHRoaXMucmVuZGVyRXJyKGpzb25FcnIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXNzYWdlID0gdGhpcy5yZW5kZXJEb3dubG9hZChqc29uKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfSBvbkNsaWNrPXt0aGlzLnJlbW92ZVNob3cuYmluZCh0aGlzKX0+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY29udGFpbmVyfT5cblx0XHRcdFxuXHRcdFx0XHR7bWVzc2FnZX1cblxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBEb3dubG9hZDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZSA9IHt9O1xudmFyIHN0YXJ0ID0gJyg/Ol58XFxcXHMpJztcbnZhciBlbmQgPSAnKD86XFxcXHN8JCknO1xuXG5mdW5jdGlvbiBsb29rdXBDbGFzcyAoY2xhc3NOYW1lKSB7XG4gIHZhciBjYWNoZWQgPSBjYWNoZVtjbGFzc05hbWVdO1xuICBpZiAoY2FjaGVkKSB7XG4gICAgY2FjaGVkLmxhc3RJbmRleCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgY2FjaGVbY2xhc3NOYW1lXSA9IGNhY2hlZCA9IG5ldyBSZWdFeHAoc3RhcnQgKyBjbGFzc05hbWUgKyBlbmQsICdnJyk7XG4gIH1cbiAgcmV0dXJuIGNhY2hlZDtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MgKGVsLCBjbGFzc05hbWUpIHtcbiAgdmFyIGN1cnJlbnQgPSBlbC5jbGFzc05hbWU7XG4gIGlmICghY3VycmVudC5sZW5ndGgpIHtcbiAgICBlbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIH0gZWxzZSBpZiAoIWxvb2t1cENsYXNzKGNsYXNzTmFtZSkudGVzdChjdXJyZW50KSkge1xuICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcm1DbGFzcyAoZWwsIGNsYXNzTmFtZSkge1xuICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZShsb29rdXBDbGFzcyhjbGFzc05hbWUpLCAnICcpLnRyaW0oKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFkZDogYWRkQ2xhc3MsXG4gIHJtOiBybUNsYXNzXG59OyIsIid1c2Ugc3RyaWN0JztcblxuLypcbiAgTW9kaWZpZWQgTCMzNjcsIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXZhY3F1YS9kcmFndWxhXG4gKi9cblxudmFyIGVtaXR0ZXIgPSByZXF1aXJlKCdjb250cmEvZW1pdHRlcicpO1xudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIGNsYXNzZXMgPSByZXF1aXJlKCcuL2NsYXNzZXMnKTtcblxuZnVuY3Rpb24gZHJhZ3VsYSAoaW5pdGlhbENvbnRhaW5lcnMsIG9wdGlvbnMpIHtcbiAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIGlmIChsZW4gPT09IDEgJiYgQXJyYXkuaXNBcnJheShpbml0aWFsQ29udGFpbmVycykgPT09IGZhbHNlKSB7XG4gICAgb3B0aW9ucyA9IGluaXRpYWxDb250YWluZXJzO1xuICAgIGluaXRpYWxDb250YWluZXJzID0gW107XG4gIH1cbiAgdmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICB2YXIgZG9jdW1lbnRFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB2YXIgX21pcnJvcjsgLy8gbWlycm9yIGltYWdlXG4gIHZhciBfc291cmNlOyAvLyBzb3VyY2UgY29udGFpbmVyXG4gIHZhciBfaXRlbTsgLy8gaXRlbSBiZWluZyBkcmFnZ2VkXG4gIHZhciBfb2Zmc2V0WDsgLy8gcmVmZXJlbmNlIHhcbiAgdmFyIF9vZmZzZXRZOyAvLyByZWZlcmVuY2UgeVxuICB2YXIgX2luaXRpYWxTaWJsaW5nOyAvLyByZWZlcmVuY2Ugc2libGluZyB3aGVuIGdyYWJiZWRcbiAgdmFyIF9jdXJyZW50U2libGluZzsgLy8gcmVmZXJlbmNlIHNpYmxpbmcgbm93XG4gIHZhciBfY29weTsgLy8gaXRlbSB1c2VkIGZvciBjb3B5aW5nXG4gIHZhciBfcmVuZGVyVGltZXI7IC8vIHRpbWVyIGZvciBzZXRUaW1lb3V0IHJlbmRlck1pcnJvckltYWdlXG4gIHZhciBfbGFzdERyb3BUYXJnZXQgPSBudWxsOyAvLyBsYXN0IGNvbnRhaW5lciBpdGVtIHdhcyBvdmVyXG4gIHZhciBfZ3JhYmJlZDsgLy8gaG9sZHMgbW91c2Vkb3duIGNvbnRleHQgdW50aWwgZmlyc3QgbW91c2Vtb3ZlXG5cbiAgdmFyIG8gPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoby5tb3ZlcyA9PT0gdm9pZCAwKSB7IG8ubW92ZXMgPSBhbHdheXM7IH1cbiAgaWYgKG8uYWNjZXB0cyA9PT0gdm9pZCAwKSB7IG8uYWNjZXB0cyA9IGFsd2F5czsgfVxuICBpZiAoby5pbnZhbGlkID09PSB2b2lkIDApIHsgby5pbnZhbGlkID0gaW52YWxpZFRhcmdldDsgfVxuICBpZiAoby5jb250YWluZXJzID09PSB2b2lkIDApIHsgby5jb250YWluZXJzID0gaW5pdGlhbENvbnRhaW5lcnMgfHwgW107IH1cbiAgaWYgKG8uaXNDb250YWluZXIgPT09IHZvaWQgMCkgeyBvLmlzQ29udGFpbmVyID0gbmV2ZXI7IH1cbiAgaWYgKG8uY29weSA9PT0gdm9pZCAwKSB7IG8uY29weSA9IGZhbHNlOyB9XG4gIGlmIChvLnJldmVydE9uU3BpbGwgPT09IHZvaWQgMCkgeyBvLnJldmVydE9uU3BpbGwgPSBmYWxzZTsgfVxuICBpZiAoby5yZW1vdmVPblNwaWxsID09PSB2b2lkIDApIHsgby5yZW1vdmVPblNwaWxsID0gZmFsc2U7IH1cbiAgaWYgKG8uZGlyZWN0aW9uID09PSB2b2lkIDApIHsgby5kaXJlY3Rpb24gPSAndmVydGljYWwnOyB9XG4gIGlmIChvLm1pcnJvckNvbnRhaW5lciA9PT0gdm9pZCAwKSB7IG8ubWlycm9yQ29udGFpbmVyID0gYm9keTsgfVxuXG4gIHZhciBkcmFrZSA9IGVtaXR0ZXIoe1xuICAgIGNvbnRhaW5lcnM6IG8uY29udGFpbmVycyxcbiAgICBzdGFydDogbWFudWFsU3RhcnQsXG4gICAgZW5kOiBlbmQsXG4gICAgY2FuY2VsOiBjYW5jZWwsXG4gICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgZGVzdHJveTogZGVzdHJveSxcbiAgICBkcmFnZ2luZzogZmFsc2VcbiAgfSk7XG5cbiAgaWYgKG8ucmVtb3ZlT25TcGlsbCA9PT0gdHJ1ZSkge1xuICAgIGRyYWtlLm9uKCdvdmVyJywgc3BpbGxPdmVyKS5vbignb3V0Jywgc3BpbGxPdXQpO1xuICB9XG5cbiAgZXZlbnRzKCk7XG5cbiAgcmV0dXJuIGRyYWtlO1xuXG4gIGZ1bmN0aW9uIGlzQ29udGFpbmVyIChlbCkge1xuICAgIHJldHVybiBkcmFrZS5jb250YWluZXJzLmluZGV4T2YoZWwpICE9PSAtMSB8fCBvLmlzQ29udGFpbmVyKGVsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV2ZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ21vdXNlZG93bicsIGdyYWIpO1xuICAgIHRvdWNoeShkb2N1bWVudEVsZW1lbnQsIG9wLCAnbW91c2V1cCcsIHJlbGVhc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZXZlbnR1YWxNb3ZlbWVudHMgKHJlbW92ZSkge1xuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XG4gICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgb3AsICdtb3VzZW1vdmUnLCBzdGFydEJlY2F1c2VNb3VzZU1vdmVkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmVtZW50cyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ3NlbGVjdHN0YXJ0JywgcHJldmVudEdyYWJiZWQpOyAvLyBJRThcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCBvcCwgJ2NsaWNrJywgcHJldmVudEdyYWJiZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgZXZlbnRzKHRydWUpO1xuICAgIHJlbGVhc2Uoe30pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldmVudEdyYWJiZWQgKGUpIHtcbiAgICBpZiAoX2dyYWJiZWQpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBncmFiIChlKSB7XG4gICAgdmFyIGlnbm9yZSA9IChlLndoaWNoICE9PSAwICYmIGUud2hpY2ggIT09IDEpIHx8IGUubWV0YUtleSB8fCBlLmN0cmxLZXk7XG4gICAgaWYgKGlnbm9yZSkge1xuICAgICAgcmV0dXJuOyAvLyB3ZSBvbmx5IGNhcmUgYWJvdXQgaG9uZXN0LXRvLWdvZCBsZWZ0IGNsaWNrcyBhbmQgdG91Y2ggZXZlbnRzXG4gICAgfVxuICAgIHZhciBpdGVtID0gZS50YXJnZXQ7XG4gICAgdmFyIGNvbnRleHQgPSBjYW5TdGFydChpdGVtKTtcbiAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX2dyYWJiZWQgPSBjb250ZXh0O1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKCk7XG4gICAgaWYgKGUudHlwZSA9PT0gJ21vdXNlZG93bicpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTsgLy8gZml4ZXMgaHR0cHM6Ly9naXRodWIuY29tL2JldmFjcXVhL2RyYWd1bGEvaXNzdWVzLzE1NVxuICAgICAgaWYgKGl0ZW0udGFnTmFtZSA9PT0gJ0lOUFVUJyB8fCBpdGVtLnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICAgICAgaXRlbS5mb2N1cygpOyAvLyBmaXhlcyBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMTc2XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRCZWNhdXNlTW91c2VNb3ZlZCAoZSkge1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKHRydWUpO1xuICAgIG1vdmVtZW50cygpO1xuICAgIGVuZCgpO1xuICAgIHN0YXJ0KF9ncmFiYmVkKTtcblxuICAgIHZhciBvZmZzZXQgPSBnZXRPZmZzZXQoX2l0ZW0pO1xuICAgIF9vZmZzZXRYID0gZ2V0Q29vcmQoJ3BhZ2VYJywgZSkgLSBvZmZzZXQubGVmdDtcbiAgICBfb2Zmc2V0WSA9IGdldENvb3JkKCdwYWdlWScsIGUpIC0gb2Zmc2V0LnRvcDtcblxuICAgIGNsYXNzZXMuYWRkKF9jb3B5IHx8IF9pdGVtLCAnZ3UtdHJhbnNpdCcpO1xuICAgIHJlbmRlck1pcnJvckltYWdlKCk7XG4gICAgZHJhZyhlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhblN0YXJ0IChpdGVtKSB7XG4gICAgaWYgKGRyYWtlLmRyYWdnaW5nICYmIF9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzQ29udGFpbmVyKGl0ZW0pKSB7XG4gICAgICByZXR1cm47IC8vIGRvbid0IGRyYWcgY29udGFpbmVyIGl0c2VsZlxuICAgIH1cbiAgICB2YXIgaGFuZGxlID0gaXRlbTtcbiAgICB3aGlsZSAoaXRlbS5wYXJlbnRFbGVtZW50ICYmIGlzQ29udGFpbmVyKGl0ZW0ucGFyZW50RWxlbWVudCkgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoby5pbnZhbGlkKGl0ZW0sIGhhbmRsZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaXRlbSA9IGl0ZW0ucGFyZW50RWxlbWVudDsgLy8gZHJhZyB0YXJnZXQgc2hvdWxkIGJlIGEgdG9wIGVsZW1lbnRcbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBzb3VyY2UgPSBpdGVtLnBhcmVudEVsZW1lbnQ7XG4gICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG8uaW52YWxpZChpdGVtLCBoYW5kbGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIG1vdmFibGUgPSBvLm1vdmVzKGl0ZW0sIHNvdXJjZSwgaGFuZGxlKTtcbiAgICBpZiAoIW1vdmFibGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaXRlbTogaXRlbSxcbiAgICAgIHNvdXJjZTogc291cmNlXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1hbnVhbFN0YXJ0IChpdGVtKSB7XG4gICAgdmFyIGNvbnRleHQgPSBjYW5TdGFydChpdGVtKTtcbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgc3RhcnQoY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQgKGNvbnRleHQpIHtcbiAgICBpZiAoby5jb3B5KSB7XG4gICAgICBfY29weSA9IGNvbnRleHQuaXRlbS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICBkcmFrZS5lbWl0KCdjbG9uZWQnLCBfY29weSwgY29udGV4dC5pdGVtLCAnY29weScpO1xuICAgIH1cblxuICAgIF9zb3VyY2UgPSBjb250ZXh0LnNvdXJjZTtcbiAgICBfaXRlbSA9IGNvbnRleHQuaXRlbTtcbiAgICBfaW5pdGlhbFNpYmxpbmcgPSBfY3VycmVudFNpYmxpbmcgPSBuZXh0RWwoY29udGV4dC5pdGVtKTtcblxuICAgIGRyYWtlLmRyYWdnaW5nID0gdHJ1ZTtcbiAgICBkcmFrZS5lbWl0KCdkcmFnJywgX2l0ZW0sIF9zb3VyY2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gaW52YWxpZFRhcmdldCAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gZW5kICgpIHtcbiAgICBpZiAoIWRyYWtlLmRyYWdnaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgZHJvcChpdGVtLCBpdGVtLnBhcmVudEVsZW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5ncmFiICgpIHtcbiAgICBfZ3JhYmJlZCA9IGZhbHNlO1xuICAgIGV2ZW50dWFsTW92ZW1lbnRzKHRydWUpO1xuICAgIG1vdmVtZW50cyh0cnVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbGVhc2UgKGUpIHtcbiAgICB1bmdyYWIoKTtcblxuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICB2YXIgY2xpZW50WCA9IGdldENvb3JkKCdjbGllbnRYJywgZSk7XG4gICAgdmFyIGNsaWVudFkgPSBnZXRDb29yZCgnY2xpZW50WScsIGUpO1xuICAgIHZhciBlbGVtZW50QmVoaW5kQ3Vyc29yID0gZ2V0RWxlbWVudEJlaGluZFBvaW50KF9taXJyb3IsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIHZhciBkcm9wVGFyZ2V0ID0gZmluZERyb3BUYXJnZXQoZWxlbWVudEJlaGluZEN1cnNvciwgY2xpZW50WCwgY2xpZW50WSk7XG4gICAgaWYgKGRyb3BUYXJnZXQgJiYgKG8uY29weSA9PT0gZmFsc2UgfHwgZHJvcFRhcmdldCAhPT0gX3NvdXJjZSkpIHtcbiAgICAgIGRyb3AoaXRlbSwgZHJvcFRhcmdldCk7XG4gICAgfSBlbHNlIGlmIChvLnJlbW92ZU9uU3BpbGwpIHtcbiAgICAgIHJlbW92ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYW5jZWwoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkcm9wIChpdGVtLCB0YXJnZXQpIHtcbiAgICBpZiAoaXNJbml0aWFsUGxhY2VtZW50KHRhcmdldCkpIHtcbiAgICAgIGRyYWtlLmVtaXQoJ2NhbmNlbCcsIGl0ZW0sIF9zb3VyY2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkcmFrZS5lbWl0KCdkcm9wJywgaXRlbSwgdGFyZ2V0LCBfc291cmNlKTtcbiAgICB9XG4gICAgY2xlYW51cCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlICgpIHtcbiAgICBpZiAoIWRyYWtlLmRyYWdnaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpdGVtID0gX2NvcHkgfHwgX2l0ZW07XG4gICAgdmFyIHBhcmVudCA9IGl0ZW0ucGFyZW50RWxlbWVudDtcbiAgICBpZiAocGFyZW50KSB7XG4gICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgfVxuICAgIGRyYWtlLmVtaXQoby5jb3B5ID8gJ2NhbmNlbCcgOiAncmVtb3ZlJywgaXRlbSwgcGFyZW50KTtcbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5jZWwgKHJldmVydCkge1xuICAgIGlmICghZHJha2UuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldmVydHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMCA/IHJldmVydCA6IG8ucmV2ZXJ0T25TcGlsbDtcbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHZhciBwYXJlbnQgPSBpdGVtLnBhcmVudEVsZW1lbnQ7XG4gICAgaWYgKHBhcmVudCA9PT0gX3NvdXJjZSAmJiBvLmNvcHkpIHtcbiAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChfY29weSk7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXNJbml0aWFsUGxhY2VtZW50KHBhcmVudCk7XG4gICAgaWYgKGluaXRpYWwgPT09IGZhbHNlICYmIG8uY29weSA9PT0gZmFsc2UgJiYgcmV2ZXJ0cykge1xuICAgICAgX3NvdXJjZS5pbnNlcnRCZWZvcmUoaXRlbSwgX2luaXRpYWxTaWJsaW5nKTtcbiAgICB9XG4gICAgaWYgKGluaXRpYWwgfHwgcmV2ZXJ0cykge1xuICAgICAgZHJha2UuZW1pdCgnY2FuY2VsJywgaXRlbSwgX3NvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRyYWtlLmVtaXQoJ2Ryb3AnLCBpdGVtLCBwYXJlbnQsIF9zb3VyY2UpO1xuICAgIH1cbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhbnVwICgpIHtcbiAgICB2YXIgaXRlbSA9IF9jb3B5IHx8IF9pdGVtO1xuICAgIHVuZ3JhYigpO1xuICAgIHJlbW92ZU1pcnJvckltYWdlKCk7XG4gICAgaWYgKGl0ZW0pIHtcbiAgICAgIGNsYXNzZXMucm0oaXRlbSwgJ2d1LXRyYW5zaXQnKTtcbiAgICB9XG4gICAgaWYgKF9yZW5kZXJUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KF9yZW5kZXJUaW1lcik7XG4gICAgfVxuICAgIGRyYWtlLmRyYWdnaW5nID0gZmFsc2U7XG4gICAgZHJha2UuZW1pdCgnb3V0JywgaXRlbSwgX2xhc3REcm9wVGFyZ2V0LCBfc291cmNlKTtcbiAgICBkcmFrZS5lbWl0KCdkcmFnZW5kJywgaXRlbSk7XG4gICAgX3NvdXJjZSA9IF9pdGVtID0gX2NvcHkgPSBfaW5pdGlhbFNpYmxpbmcgPSBfY3VycmVudFNpYmxpbmcgPSBfcmVuZGVyVGltZXIgPSBfbGFzdERyb3BUYXJnZXQgPSBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJbml0aWFsUGxhY2VtZW50ICh0YXJnZXQsIHMpIHtcbiAgICB2YXIgc2libGluZztcbiAgICBpZiAocyAhPT0gdm9pZCAwKSB7XG4gICAgICBzaWJsaW5nID0gcztcbiAgICB9IGVsc2UgaWYgKF9taXJyb3IpIHtcbiAgICAgIHNpYmxpbmcgPSBfY3VycmVudFNpYmxpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNpYmxpbmcgPSBuZXh0RWwoX2NvcHkgfHwgX2l0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0ID09PSBfc291cmNlICYmIHNpYmxpbmcgPT09IF9pbml0aWFsU2libGluZztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmREcm9wVGFyZ2V0IChlbGVtZW50QmVoaW5kQ3Vyc29yLCBjbGllbnRYLCBjbGllbnRZKSB7XG4gICAgdmFyIHRhcmdldCA9IGVsZW1lbnRCZWhpbmRDdXJzb3I7XG4gICAgd2hpbGUgKHRhcmdldCAmJiAhYWNjZXB0ZWQoKSkge1xuICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG5cbiAgICBmdW5jdGlvbiBhY2NlcHRlZCAoKSB7XG4gICAgICB2YXIgZHJvcHBhYmxlID0gaXNDb250YWluZXIodGFyZ2V0KTtcbiAgICAgIGlmIChkcm9wcGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGltbWVkaWF0ZSA9IGdldEltbWVkaWF0ZUNoaWxkKHRhcmdldCwgZWxlbWVudEJlaGluZEN1cnNvcik7XG4gICAgICB2YXIgcmVmZXJlbmNlID0gZ2V0UmVmZXJlbmNlKHRhcmdldCwgaW1tZWRpYXRlLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICAgIHZhciBpbml0aWFsID0gaXNJbml0aWFsUGxhY2VtZW50KHRhcmdldCwgcmVmZXJlbmNlKTtcbiAgICAgIGlmIChpbml0aWFsKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBzaG91bGQgYWx3YXlzIGJlIGFibGUgdG8gZHJvcCBpdCByaWdodCBiYWNrIHdoZXJlIGl0IHdhc1xuICAgICAgfVxuICAgICAgcmV0dXJuIG8uYWNjZXB0cyhfaXRlbSwgdGFyZ2V0LCBfc291cmNlLCByZWZlcmVuY2UpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRyYWcgKGUpIHtcbiAgICBpZiAoIV9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIGNsaWVudFggPSBnZXRDb29yZCgnY2xpZW50WCcsIGUpO1xuICAgIHZhciBjbGllbnRZID0gZ2V0Q29vcmQoJ2NsaWVudFknLCBlKTtcbiAgICB2YXIgeCA9IGNsaWVudFggLSBfb2Zmc2V0WDtcbiAgICB2YXIgeSA9IGNsaWVudFkgLSBfb2Zmc2V0WTtcblxuICAgIF9taXJyb3Iuc3R5bGUubGVmdCA9IHggKyAncHgnO1xuICAgIF9taXJyb3Iuc3R5bGUudG9wICA9IHkgKyAncHgnO1xuXG4gICAgdmFyIGl0ZW0gPSBfY29weSB8fCBfaXRlbTtcbiAgICB2YXIgZWxlbWVudEJlaGluZEN1cnNvciA9IGdldEVsZW1lbnRCZWhpbmRQb2ludChfbWlycm9yLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICB2YXIgZHJvcFRhcmdldCA9IGZpbmREcm9wVGFyZ2V0KGVsZW1lbnRCZWhpbmRDdXJzb3IsIGNsaWVudFgsIGNsaWVudFkpO1xuICAgIHZhciBjaGFuZ2VkID0gZHJvcFRhcmdldCAhPT0gbnVsbCAmJiBkcm9wVGFyZ2V0ICE9PSBfbGFzdERyb3BUYXJnZXQ7XG4gICAgaWYgKGNoYW5nZWQgfHwgZHJvcFRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgb3V0KCk7XG4gICAgICBfbGFzdERyb3BUYXJnZXQgPSBkcm9wVGFyZ2V0O1xuICAgICAgb3ZlcigpO1xuICAgIH1cbiAgICBpZiAoZHJvcFRhcmdldCA9PT0gX3NvdXJjZSAmJiBvLmNvcHkpIHtcbiAgICAgIGlmIChpdGVtLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgaXRlbS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGl0ZW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgcmVmZXJlbmNlO1xuICAgIHZhciBpbW1lZGlhdGUgPSBnZXRJbW1lZGlhdGVDaGlsZChkcm9wVGFyZ2V0LCBlbGVtZW50QmVoaW5kQ3Vyc29yKTtcbiAgICBpZiAoaW1tZWRpYXRlICE9PSBudWxsKSB7XG4gICAgICByZWZlcmVuY2UgPSBnZXRSZWZlcmVuY2UoZHJvcFRhcmdldCwgaW1tZWRpYXRlLCBjbGllbnRYLCBjbGllbnRZKTtcbiAgICB9IGVsc2UgaWYgKG8ucmV2ZXJ0T25TcGlsbCA9PT0gdHJ1ZSAmJiAhby5jb3B5KSB7XG4gICAgICByZWZlcmVuY2UgPSBfaW5pdGlhbFNpYmxpbmc7XG4gICAgICBkcm9wVGFyZ2V0ID0gX3NvdXJjZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG8uY29weSAmJiBpdGVtLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgaXRlbS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGl0ZW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICByZWZlcmVuY2UgPT09IG51bGwgfHxcbiAgICAgIHJlZmVyZW5jZSAhPT0gaXRlbSAmJlxuICAgICAgcmVmZXJlbmNlICE9PSBuZXh0RWwoaXRlbSkgJiZcbiAgICAgIHJlZmVyZW5jZSAhPT0gX2N1cnJlbnRTaWJsaW5nXG4gICAgKSB7XG4gICAgICBfY3VycmVudFNpYmxpbmcgPSByZWZlcmVuY2U7XG4gICAgICAvL2Ryb3BUYXJnZXQuaW5zZXJ0QmVmb3JlKGl0ZW0sIHJlZmVyZW5jZSk7XG4gICAgICBkcmFrZS5lbWl0KCdzaGFkb3cnLCBpdGVtLCBkcm9wVGFyZ2V0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbW92ZWQgKHR5cGUpIHsgZHJha2UuZW1pdCh0eXBlLCBpdGVtLCBfbGFzdERyb3BUYXJnZXQsIF9zb3VyY2UpOyB9XG4gICAgZnVuY3Rpb24gb3ZlciAoKSB7IGlmIChjaGFuZ2VkKSB7IG1vdmVkKCdvdmVyJyk7IH0gfVxuICAgIGZ1bmN0aW9uIG91dCAoKSB7IGlmIChfbGFzdERyb3BUYXJnZXQpIHsgbW92ZWQoJ291dCcpOyB9IH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNwaWxsT3ZlciAoZWwpIHtcbiAgICBjbGFzc2VzLnJtKGVsLCAnZ3UtaGlkZScpO1xuICB9XG5cbiAgZnVuY3Rpb24gc3BpbGxPdXQgKGVsKSB7XG4gICAgaWYgKGRyYWtlLmRyYWdnaW5nKSB7IGNsYXNzZXMuYWRkKGVsLCAnZ3UtaGlkZScpOyB9XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJNaXJyb3JJbWFnZSAoKSB7XG4gICAgaWYgKF9taXJyb3IpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJlY3QgPSBfaXRlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBfbWlycm9yID0gX2l0ZW0uY2xvbmVOb2RlKHRydWUpO1xuICAgIF9taXJyb3Iuc3R5bGUud2lkdGggPSBnZXRSZWN0V2lkdGgocmVjdCkgKyAncHgnO1xuICAgIF9taXJyb3Iuc3R5bGUuaGVpZ2h0ID0gZ2V0UmVjdEhlaWdodChyZWN0KSArICdweCc7XG4gICAgY2xhc3Nlcy5ybShfbWlycm9yLCAnZ3UtdHJhbnNpdCcpO1xuICAgIGNsYXNzZXMuYWRkKF9taXJyb3IsICdndS1taXJyb3InKTtcbiAgICBvLm1pcnJvckNvbnRhaW5lci5hcHBlbmRDaGlsZChfbWlycm9yKTtcbiAgICB0b3VjaHkoZG9jdW1lbnRFbGVtZW50LCAnYWRkJywgJ21vdXNlbW92ZScsIGRyYWcpO1xuICAgIGNsYXNzZXMuYWRkKG8ubWlycm9yQ29udGFpbmVyLCAnZ3UtdW5zZWxlY3RhYmxlJyk7XG4gICAgZHJha2UuZW1pdCgnY2xvbmVkJywgX21pcnJvciwgX2l0ZW0sICdtaXJyb3InKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZU1pcnJvckltYWdlICgpIHtcbiAgICBpZiAoX21pcnJvcikge1xuICAgICAgY2xhc3Nlcy5ybShvLm1pcnJvckNvbnRhaW5lciwgJ2d1LXVuc2VsZWN0YWJsZScpO1xuICAgICAgdG91Y2h5KGRvY3VtZW50RWxlbWVudCwgJ3JlbW92ZScsICdtb3VzZW1vdmUnLCBkcmFnKTtcbiAgICAgIF9taXJyb3IucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChfbWlycm9yKTtcbiAgICAgIF9taXJyb3IgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEltbWVkaWF0ZUNoaWxkIChkcm9wVGFyZ2V0LCB0YXJnZXQpIHtcbiAgICB2YXIgaW1tZWRpYXRlID0gdGFyZ2V0O1xuICAgIHdoaWxlIChpbW1lZGlhdGUgIT09IGRyb3BUYXJnZXQgJiYgaW1tZWRpYXRlLnBhcmVudEVsZW1lbnQgIT09IGRyb3BUYXJnZXQpIHtcbiAgICAgIGltbWVkaWF0ZSA9IGltbWVkaWF0ZS5wYXJlbnRFbGVtZW50O1xuICAgIH1cbiAgICBpZiAoaW1tZWRpYXRlID09PSBkb2N1bWVudEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gaW1tZWRpYXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVmZXJlbmNlIChkcm9wVGFyZ2V0LCB0YXJnZXQsIHgsIHkpIHtcbiAgICB2YXIgaG9yaXpvbnRhbCA9IG8uZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCc7XG4gICAgdmFyIHJlZmVyZW5jZSA9IHRhcmdldCAhPT0gZHJvcFRhcmdldCA/IGluc2lkZSgpIDogb3V0c2lkZSgpO1xuICAgIHJldHVybiByZWZlcmVuY2U7XG5cbiAgICBmdW5jdGlvbiBvdXRzaWRlICgpIHsgLy8gc2xvd2VyLCBidXQgYWJsZSB0byBmaWd1cmUgb3V0IGFueSBwb3NpdGlvblxuICAgICAgdmFyIGxlbiA9IGRyb3BUYXJnZXQuY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgdmFyIGk7XG4gICAgICB2YXIgZWw7XG4gICAgICB2YXIgcmVjdDtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBlbCA9IGRyb3BUYXJnZXQuY2hpbGRyZW5baV07XG4gICAgICAgIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgaWYgKGhvcml6b250YWwgJiYgcmVjdC5sZWZ0ID4geCkgeyByZXR1cm4gZWw7IH1cbiAgICAgICAgaWYgKCFob3Jpem9udGFsICYmIHJlY3QudG9wID4geSkgeyByZXR1cm4gZWw7IH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2lkZSAoKSB7IC8vIGZhc3RlciwgYnV0IG9ubHkgYXZhaWxhYmxlIGlmIGRyb3BwZWQgaW5zaWRlIGEgY2hpbGQgZWxlbWVudFxuICAgICAgdmFyIHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBpZiAoaG9yaXpvbnRhbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZSh4ID4gcmVjdC5sZWZ0ICsgZ2V0UmVjdFdpZHRoKHJlY3QpIC8gMik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb2x2ZSh5ID4gcmVjdC50b3AgKyBnZXRSZWN0SGVpZ2h0KHJlY3QpIC8gMik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZSAoYWZ0ZXIpIHtcbiAgICAgIHJldHVybiBhZnRlciA/IG5leHRFbCh0YXJnZXQpIDogdGFyZ2V0O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB0b3VjaHkgKGVsLCBvcCwgdHlwZSwgZm4pIHtcbiAgdmFyIHRvdWNoID0ge1xuICAgIG1vdXNldXA6ICd0b3VjaGVuZCcsXG4gICAgbW91c2Vkb3duOiAndG91Y2hzdGFydCcsXG4gICAgbW91c2Vtb3ZlOiAndG91Y2htb3ZlJ1xuICB9O1xuICB2YXIgbWljcm9zb2Z0ID0ge1xuICAgIG1vdXNldXA6ICdNU1BvaW50ZXJVcCcsXG4gICAgbW91c2Vkb3duOiAnTVNQb2ludGVyRG93bicsXG4gICAgbW91c2Vtb3ZlOiAnTVNQb2ludGVyTW92ZSdcbiAgfTtcbiAgaWYgKGdsb2JhbC5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZCkge1xuICAgIGNyb3NzdmVudFtvcF0oZWwsIG1pY3Jvc29mdFt0eXBlXSwgZm4pO1xuICB9XG4gIGNyb3NzdmVudFtvcF0oZWwsIHRvdWNoW3R5cGVdLCBmbik7XG4gIGNyb3NzdmVudFtvcF0oZWwsIHR5cGUsIGZuKTtcbn1cblxuZnVuY3Rpb24gZ2V0T2Zmc2V0IChlbCkge1xuICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IHJlY3QubGVmdCArIGdldFNjcm9sbCgnc2Nyb2xsTGVmdCcsICdwYWdlWE9mZnNldCcpLFxuICAgIHRvcDogcmVjdC50b3AgKyBnZXRTY3JvbGwoJ3Njcm9sbFRvcCcsICdwYWdlWU9mZnNldCcpXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFNjcm9sbCAoc2Nyb2xsUHJvcCwgb2Zmc2V0UHJvcCkge1xuICBpZiAodHlwZW9mIGdsb2JhbFtvZmZzZXRQcm9wXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gZ2xvYmFsW29mZnNldFByb3BdO1xuICB9XG4gIHZhciBkb2N1bWVudEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGlmIChkb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50RWxlbWVudFtzY3JvbGxQcm9wXTtcbiAgfVxuICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIHJldHVybiBib2R5W3Njcm9sbFByb3BdO1xufVxuXG5mdW5jdGlvbiBnZXRFbGVtZW50QmVoaW5kUG9pbnQgKHBvaW50LCB4LCB5KSB7XG4gIHZhciBwID0gcG9pbnQgfHwge307XG4gIHZhciBzdGF0ZSA9IHAuY2xhc3NOYW1lO1xuICB2YXIgZWw7XG4gIHAuY2xhc3NOYW1lICs9ICcgZ3UtaGlkZSc7XG4gIGVsID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludCh4LCB5KTtcbiAgcC5jbGFzc05hbWUgPSBzdGF0ZTtcbiAgcmV0dXJuIGVsO1xufVxuXG5mdW5jdGlvbiBuZXZlciAoKSB7IHJldHVybiBmYWxzZTsgfVxuZnVuY3Rpb24gYWx3YXlzICgpIHsgcmV0dXJuIHRydWU7IH1cblxuZnVuY3Rpb24gbmV4dEVsIChlbCkge1xuICByZXR1cm4gZWwubmV4dEVsZW1lbnRTaWJsaW5nIHx8IG1hbnVhbGx5KCk7XG4gIGZ1bmN0aW9uIG1hbnVhbGx5ICgpIHtcbiAgICB2YXIgc2libGluZyA9IGVsO1xuICAgIGRvIHtcbiAgICAgIHNpYmxpbmcgPSBzaWJsaW5nLm5leHRTaWJsaW5nO1xuICAgIH0gd2hpbGUgKHNpYmxpbmcgJiYgc2libGluZy5ub2RlVHlwZSAhPT0gMSk7XG4gICAgcmV0dXJuIHNpYmxpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RXZlbnRIb3N0IChlKSB7XG4gIC8vIG9uIHRvdWNoZW5kIGV2ZW50LCB3ZSBoYXZlIHRvIHVzZSBgZS5jaGFuZ2VkVG91Y2hlc2BcbiAgLy8gc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzE5MjU2My90b3VjaGVuZC1ldmVudC1wcm9wZXJ0aWVzXG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYmV2YWNxdWEvZHJhZ3VsYS9pc3N1ZXMvMzRcbiAgaWYgKGUudGFyZ2V0VG91Y2hlcyAmJiBlLnRhcmdldFRvdWNoZXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGUudGFyZ2V0VG91Y2hlc1swXTtcbiAgfVxuICBpZiAoZS5jaGFuZ2VkVG91Y2hlcyAmJiBlLmNoYW5nZWRUb3VjaGVzLmxlbmd0aCkge1xuICAgIHJldHVybiBlLmNoYW5nZWRUb3VjaGVzWzBdO1xuICB9XG4gIHJldHVybiBlO1xufVxuXG5mdW5jdGlvbiBnZXRDb29yZCAoY29vcmQsIGUpIHtcbiAgdmFyIGhvc3QgPSBnZXRFdmVudEhvc3QoZSk7XG4gIHZhciBtaXNzTWFwID0ge1xuICAgIHBhZ2VYOiAnY2xpZW50WCcsIC8vIElFOFxuICAgIHBhZ2VZOiAnY2xpZW50WScgLy8gSUU4XG4gIH07XG4gIGlmIChjb29yZCBpbiBtaXNzTWFwICYmICEoY29vcmQgaW4gaG9zdCkgJiYgbWlzc01hcFtjb29yZF0gaW4gaG9zdCkge1xuICAgIGNvb3JkID0gbWlzc01hcFtjb29yZF07XG4gIH1cbiAgcmV0dXJuIGhvc3RbY29vcmRdO1xufVxuXG5mdW5jdGlvbiBnZXRSZWN0V2lkdGggKHJlY3QpIHtcbiAgcmV0dXJuIHJlY3Qud2lkdGggfHwgKHJlY3QucmlnaHQgLSByZWN0LmxlZnQpO1xufVxuXG5mdW5jdGlvbiBnZXRSZWN0SGVpZ2h0IChyZWN0KSB7XG4gIHJldHVybiByZWN0LmhlaWdodCB8fCAocmVjdC5ib3R0b20gLSByZWN0LnRvcCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZHJhZ3VsYTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRyYWd1bGEgPSByZXF1aXJlKCcuL2RyYWd1bGEnKTtcbnZhciBhdG9hID0gcmVxdWlyZSgnYXRvYScpO1xuXG5mdW5jdGlvbiByZWFjdERyYWd1bGEgKCkge1xuICByZXR1cm4gZHJhZ3VsYS5hcHBseSh0aGlzLCBhdG9hKGFyZ3VtZW50cykpLm9uKCdjbG9uZWQnLCBjbG9uZWQpO1xuXG4gIGZ1bmN0aW9uIGNsb25lZCAoY2xvbmUpIHtcbiAgICBybShjbG9uZSk7XG4gICAgYXRvYShjbG9uZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpKS5mb3JFYWNoKHJtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJtIChlbCkge1xuICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1yZWFjdGlkJyk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZWFjdERyYWd1bGE7IiwiY2xhc3MgSW5mbyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0XG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cdFx0XHR3cmFwcGVyOiAncG9wdXAtd3JhcHBlcicsXG5cdFx0XHRjb250YWluZXI6ICdwb3B1cC1jb250YWluZXInLFxuXG5cdFx0fVxuXHR9XG5cblx0cmVtb3ZlU2hvdyhidXR0b25DbGljaywgZXZlbnQpIHtcblx0XHRjb25zdCByZW1vdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGFwcERpc3BhdGNoZXIuZGlzcGF0Y2goQVBQX0FDVElPTlMuYXBwX2hpZGVfcG9wdXAoKSk7XG5cdFx0fVxuXG5cdFx0aWYgKGJ1dHRvbkNsaWNrLnRhcmdldCkgZXZlbnQgPSBidXR0b25DbGljaztcblx0XHRpZiAoYnV0dG9uQ2xpY2sgPT09IHRydWUpIHtcblx0XHRcdHJlbW92ZSgpO1x0XHRcdFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldC5jbGFzc05hbWUgPT09IHRoaXMuc3R5bGVzLndyYXBwZXIpIHtcblx0XHRcdFx0cmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zaG93KSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy53cmFwcGVyfSBvbkNsaWNrPXt0aGlzLnJlbW92ZVNob3cuYmluZCh0aGlzKX0+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuY29udGFpbmVyfT5cblx0XHRcdFxuXHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdDxoMz5JdGVtIEJ1aWxkZXI8L2gzPlxuXHRcdFx0XHRcdDxwPlxuXHRcdFx0XHRcdFx0VGhpcyBwcm9qZWN0IGlzIGFuIG9wZW4gc291cmNlIHByb2plY3QsIHlvdSBjYW4gdmlldyB0aGUgY29kZSBvbiA8YSBocmVmPSdodHRwOi8vZ2l0aHViLmNvbS9obnJ5L2l0ZW1idWlsZGVyJyB0YXJnZXQ9J19ibGFuayc+R2l0SHViPC9hPlxuXHRcdFx0XHRcdDwvcD5cblx0XHRcdFx0XHQ8cD5cblx0XHRcdFx0XHRcdEl0IHdhcyBjcmVhdGVkIGFzIHBhcnQgb2YgdGhlIFJpb3QgMi4wIEFQSSBjaGFsbGVuZ2UuXG5cdFx0XHRcdFx0PC9wPlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHRcdFx0PHNtYWxsPkl0ZW0gQnVpbGRlciBpc24ndCBlbmRvcnNlZCBieSBSaW90IEdhbWVzIGFuZCBkb2Vzbid0IHJlZmxlY3QgdGhlIHZpZXdzIG9yIG9waW5pb25zIG9mIFJpb3QgR2FtZXMgb3IgYW55b25lIG9mZmljaWFsbHkgaW52b2x2ZWQgaW4gcHJvZHVjaW5nIG9yIG1hbmFnaW5nIExlYWd1ZSBvZiBMZWdlbmRzLiBMZWFndWUgb2YgTGVnZW5kcyBhbmQgUmlvdCBHYW1lcyBhcmUgdHJhZGVtYXJrcyBvciByZWdpc3RlcmVkIHRyYWRlbWFya3Mgb2YgUmlvdCBHYW1lcywgSW5jLiBMZWFndWUgb2YgTGVnZW5kcyDCqSBSaW90IEdhbWVzLCBJbmMuPC9zbWFsbD5cblx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5mbztcbiIsIi8qXG5cdG9uSG92ZXIgYW5kIGRpc3BsYXkgSXRlbSBpY29uIGltYWdlXG4gKi9cblxuY2xhc3MgSXRlbUJ1dHRvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHRcblx0XHR0aGlzLnN0eWxlcyA9IHtcblx0XHRcdHBvcHVwSGlkZTogJ2l0ZW0tcG9wLWhpZGUnLFxuXHRcdFx0cG9wdXBTaG93OiAnaXRlbS1wb3Atc2hvdycsXG5cdFx0XHRwb3B1cDogJ2l0ZW0tcG9wJ1xuXHRcdH07XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0cG9wdXA6IGZhbHNlLFxuXHRcdFx0aXRlbToge31cblx0XHR9O1xuXG5cdFx0dGhpcy50b2tlbiA9IDA7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHRsZXQgaXRlbTtcblx0XHRjb25zdCB0aGF0ID0gdGhpcztcblxuXHRcdHRoaXMudG9rZW4gPSBJdGVtU3RvcmUubm90aWZ5KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRoYXQucHJvcHMuaXRlbSkge1xuXHRcdFx0XHRpdGVtID0gdGhhdC5wcm9wcy5pdGVtO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlbSA9IEl0ZW1TdG9yZS5nZXRCeUlkKHRoYXQucHJvcHMuaXRlbUlkKTtcblx0XHRcdH1cblx0XHRcdHRoYXQuc2V0U3RhdGUoeyBpdGVtOiBpdGVtIH0pO1x0XHRcblx0XHR9KTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdEl0ZW1TdG9yZS51bm5vdGlmeSh0aGlzLnRva2VuKTtcblx0fVxuXG5cdGhhbmRsZUhvdmVyT24oKSB7XG5cdFx0Ly9jb25zb2xlLmxvZyh0aGlzLnN0YXRlLml0ZW0pO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBwb3B1cDogdHJ1ZSB9KTtcblx0fVxuXG5cdGhhbmRsZUhvdmVyT2ZmKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBwb3B1cDogZmFsc2UgfSk7XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0aWYgKCF0aGlzLnN0YXRlLml0ZW0gfHwgT2JqZWN0LmtleXModGhpcy5zdGF0ZS5pdGVtKS5sZW5ndGggPCAxKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0bGV0IHBvcFVwRGlzcGxheSA9IHRoaXMuc3R5bGVzLnBvcHVwSGlkZTtcblx0XHRpZiAodGhpcy5zdGF0ZS5wb3B1cCkgcG9wVXBEaXNwbGF5ID0gdGhpcy5zdHlsZXMucG9wdXBTaG93O1xuXG5cdFx0cmV0dXJuIChcblx0XHQ8ZGl2IGRhdGEtaXRlbS1pZD17dGhpcy5zdGF0ZS5pdGVtLmlkfT5cblx0XHRcdDxpbWcgc3JjPXt0aGlzLnN0YXRlLml0ZW0uZ2V0SW1hZ2UoKX0gb25Nb3VzZUVudGVyPXt0aGlzLmhhbmRsZUhvdmVyT24uYmluZCh0aGlzKX0gb25Nb3VzZUxlYXZlPXt0aGlzLmhhbmRsZUhvdmVyT2ZmLmJpbmQodGhpcyl9IC8+XG5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXsncm93ICcgKyB0aGlzLnN0eWxlcy5wb3B1cCArICcgJyArIHBvcFVwRGlzcGxheX0+XG5cdFx0XHRcdHt0aGlzLnN0YXRlLml0ZW0ubmFtZX1cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdHt0aGlzLnN0YXRlLml0ZW0uZGVzY3JpcHRpb259XG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHR7dGhpcy5zdGF0ZS5pdGVtLmdvbGQuYmFzZX0gPGltZyBzcmM9J2h0dHA6Ly9kZHJhZ29uLmxlYWd1ZW9mbGVnZW5kcy5jb20vY2RuLzUuNS4xL2ltZy91aS9nb2xkLnBuZycgLz5cblx0XHRcdDwvZGl2PlxuXG5cdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IEl0ZW1CdXR0b247IiwiY2xhc3MgU2hhcmUgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ3BvcHVwLXdyYXBwZXInLFxuXHRcdFx0Y29udGFpbmVyOiAncG9wdXAtY29udGFpbmVyJyxcblxuXHRcdFx0c2hhcmVDb250YWluZXI6ICdzaGFyZS1tb2RhbCdcblx0XHR9XG5cdH1cblxuXHRyZW1vdmVTaG93KGJ1dHRvbkNsaWNrLCBldmVudCkge1xuXHRcdGNvbnN0IHJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0YXBwRGlzcGF0Y2hlci5kaXNwYXRjaChBUFBfQUNUSU9OUy5hcHBfaGlkZV9wb3B1cCgpKTtcblx0XHR9XG5cblx0XHRpZiAoYnV0dG9uQ2xpY2sudGFyZ2V0KSBldmVudCA9IGJ1dHRvbkNsaWNrO1xuXHRcdGlmIChidXR0b25DbGljayA9PT0gdHJ1ZSkge1xuXHRcdFx0cmVtb3ZlKCk7XHRcdFx0XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0LmNsYXNzTmFtZSA9PT0gdGhpcy5zdHlsZXMud3JhcHBlcikge1xuXHRcdFx0XHRyZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZW5kZXIoKSB7XG5cdFx0Ly8gVE9ET1xuXHRcdC8vIGlmIHVzaW5nIEhUTUw1IGZhbGxiYWNrICgvIy8pXG5cdFx0Ly8gdGhpcy5jb250ZXh0LnJvdXRlci5tYWtlSHJlZiByZXR1cm5zICMvXG5cdFx0Ly8gc28gaGF2ZSB0byBwcmVwZW5kIGEgJy8nIGluIHRoaXMgY2FzZVxuXHRcdGNvbnN0IGxpbmsgPSAnaHR0cDovLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIHRoaXMuY29udGV4dC5yb3V0ZXIubWFrZUhyZWYoJ3ZpZXcnLCB7IGlkOiB0aGlzLnByb3BzLmlkIH0pO1xuXG5cdFx0aWYgKCF0aGlzLnByb3BzLnNob3cpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0PGRpdiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLndyYXBwZXJ9IG9uQ2xpY2s9e3RoaXMucmVtb3ZlU2hvdy5iaW5kKHRoaXMpfT5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPXt0aGlzLnN0eWxlcy5jb250YWluZXJ9PlxuXHRcdFx0XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17dGhpcy5zdHlsZXMuc2hhcmVDb250YWluZXJ9PlxuXHRcdFx0XHQ8aDMgY2xhc3NOYW1lPSd4Zm9udC10aGluJz5TaGFyZTwvaDM+XG5cdFx0XHRcdDxociAvPlxuXHRcdFx0XHRTaGFyZSB5b3VyIGl0ZW0gYnVpbGQgd2l0aCBvdGhlcnMgdXNpbmcgdGhpcyBsaW5rOlxuXHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0PGlucHV0IHR5cGU9J3RleHQnIGRlZmF1bHRWYWx1ZT17bGlua30gcmVhZE9ubHkgLz5cblx0XHRcdFx0PGJyIC8+XG5cdFx0XHRcdDxiciAvPlxuXHRcdFx0XHRPciBzaGFyZSBpdCBvbiB5b3VyIHNvY2lhbCBtZWRpYSxcblx0XHRcdDwvZGl2PlxuXG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59XG5cblNoYXJlLmNvbnRleHRUeXBlcyA9IHtcblx0cm91dGVyOiBSZWFjdC5Qcm9wVHlwZXMuZnVuY1xufVxuXG5leHBvcnQgZGVmYXVsdCBTaGFyZTsiLCJpbXBvcnQgVmlld0J1aWxkIGZyb20gJy4vdmlld0J1aWxkJztcbmltcG9ydCBWaWV3RGlzcGxheSBmcm9tICcuL3ZpZXdEaXNwbGF5JztcbmltcG9ydCBJdGVtQnV0dG9uIGZyb20gJy4uL2l0ZW1CdXR0b24nO1xuXG5pbXBvcnQgU2hhcmUgZnJvbSAnLi4vc2hhcmUnO1xuaW1wb3J0IERvd25sb2FkIGZyb20gJy4uL2Rvd25sb2FkJztcbmltcG9ydCBJbmZvIGZyb20gJy4uL2luZm8nO1xuXG5jbGFzcyBWaWV3IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdFxuXHRcdHRoaXMuc3R5bGVzID0ge307XG5cblx0XHR0aGlzLnN0YXRlID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc3RhdGUuYXBwID0gYXBwU3RvcmUuZ2V0QWxsKCk7XG5cblx0XHR0aGlzLnRva2VuSXRlbVNldFN0b3JlID0gMDtcblx0XHR0aGlzLnRva2VuQXBwU3RvcmUgPSAwO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy50b2tlbkl0ZW1TZXRTdG9yZSA9IGl0ZW1TZXRTdG9yZS5hZGRMaXN0ZW5lcih0aGlzLl9vbkNoYW5nZS5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnRva2VuQXBwU3RvcmUgPSBhcHBTdG9yZS5hZGRMaXN0ZW5lcih0aGlzLl9vbkFwcENoYW5nZS5iaW5kKHRoaXMpKTtcblxuXHRcdC8vIFRPRE8gY291bGQgZG8gc29tZSBxdWljayBJRCB2YWxpZGF0aW9uXG5cdFx0Ly8gdG8gZGV0ZWN0IG9idmlvdXMgYmFkIElEcyBhbmQgbm90IGJvdGhlciBsb2FkaW5nLi5cblx0XHRhcHBEaXNwYXRjaGVyLmRpc3BhdGNoKEFQUF9BQ1RJT05TLmxvYWRfZGF0YSh0aGlzLnByb3BzLnBhcmFtcy5pZCkpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0aXRlbVNldFN0b3JlLnJlbW92ZUxpc3RlbmVyKCcnLCB0aGlzLnRva2VuSXRlbVNldFN0b3JlKTtcblx0XHRhcHBTdG9yZS5yZW1vdmVMaXN0ZW5lcignJywgdGhpcy50b2tlbkFwcFN0b3JlKTtcblx0fVxuXG5cdF9vbkNoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gaXRlbVNldFN0b3JlLmdldEFsbCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoZGF0YSk7XG5cdH1cblx0XG5cdF9vbkFwcENoYW5nZSgpIHtcblx0XHRjb25zdCBkYXRhID0gYXBwU3RvcmUuZ2V0QWxsKCk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IGFwcDogZGF0YSB9KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHQvLyBoYXZlIHRvIGNoZWNrIGlmIHJlc291cmNlIGV4aXN0cyBcblx0XHQvLyBpZiBub3QgcmVuZGVyIHNvbWV0aGluZyBkaWZmZXJlbnQgVE9ET1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0ncm93Jz5cblxuXHRcdFx0XHQ8U2hhcmUgaWQ9e3RoaXMuc3RhdGUuaWR9IHNob3c9e3RoaXMuc3RhdGUuYXBwLnNob3dTaGFyZX0gLz5cblx0XHRcdFx0PERvd25sb2FkIHNob3c9e3RoaXMuc3RhdGUuYXBwLnNob3dEb3dubG9hZH0gZGF0YT17dGhpcy5zdGF0ZS5pdGVtc2V0fSBpZD17dGhpcy5zdGF0ZS5pZH0gLz5cblx0XHRcdFx0PEluZm8gc2hvdz17dGhpcy5zdGF0ZS5hcHAuc2hvd0luZm99IC8+XG5cblxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTUgY29sLXNtLTUgY29sLW1kLTUnPlxuXHRcdFx0XHRcdDxWaWV3RGlzcGxheSBpdGVtc2V0PXt0aGlzLnN0YXRlLml0ZW1zZXR9IC8+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nY29sLXhzLTUgY29sLXNtLTUgY29sLW1kLTUnPlxuXHRcdFx0XHRcdDxWaWV3QnVpbGQgYXBpVmVyc2lvbj17dGhpcy5wcm9wcy5hcGlWZXJzaW9ufSBkYXRhPXt0aGlzLnN0YXRlfSAvPlxuXHRcdFx0XHQ8L2Rpdj5cblxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXc7IiwiY2xhc3MgVmlld0J1aWxkIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zdHlsZXMgPSB7XG5cblx0XHR9XG5cdH1cblxuXHRyZW5kZXJDaGFtcGlvbkltYWdlKCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5kYXRhLmNoYW1waW9uLnJpb3RLZXkpIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gKDxpbWcgc3JjPXsnaHR0cDovL2RkcmFnb24ubGVhZ3Vlb2ZsZWdlbmRzLmNvbS9jZG4vJyArIHRoaXMucHJvcHMuYXBpVmVyc2lvbiArICcvaW1nL2NoYW1waW9uLycgKyB0aGlzLnByb3BzLmRhdGEuY2hhbXBpb24ucmlvdEtleSArICcucG5nJ30gLz4pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdHt0aGlzLnByb3BzLmRhdGEuaXRlbXNldC50aXRsZX1cblx0XHRcdFx0XHQ8YnIgLz5cblx0XHRcdFx0XHR7dGhpcy5yZW5kZXJDaGFtcGlvbkltYWdlKCl9XG5cdFx0XHRcdFx0e3RoaXMucHJvcHMuZGF0YS5jaGFtcGlvbi5uYW1lfVxuXHRcdFx0XHRcdDxiciAvPlxuXHRcdFx0XHRcdDxiciAvPlxuXHRcdFx0XHRcdG1hcCBpbmZvXG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlld0J1aWxkOyIsImltcG9ydCBJdGVtQnV0dG9uIGZyb20gJy4uL2l0ZW1CdXR0b24nO1xuXG5jbGFzcyBWaWV3RGlzcGxheSBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblxuXHRcdHRoaXMuc3R5bGVzID0ge1xuXHRcdFx0d3JhcHBlcjogJ3ZpZXctZGlzcGxheScsXG5cdFx0XHRibG9ja1RpdGxlOiAndmlldy1kaXNwbGF5LWJsb2NrLXRpdGxlIHhmb250JyxcblxuXHRcdH1cblx0fVxuXG5cdHJlbmRlckJsb2NrSXRlbXMoaXRlbXMpIHtcblx0XHRyZXR1cm4gaXRlbXMubWFwKChpdGVtLCBpZHgpID0+IHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdDxkaXYga2V5PXtpdGVtLmlkICsgJy0nICsgaWR4fT5cblx0XHRcdFx0XHQ8SXRlbUJ1dHRvbiBpdGVtSWQ9e2l0ZW0uaWR9IC8+XG5cdFx0XHRcdFx0PHNwYW4+e2l0ZW0uY291bnR9PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdCk7XG5cdFx0fSk7XG5cdH1cblxuXHRyZW5kZXJCbG9ja3MoKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvcHMuaXRlbXNldC5ibG9ja3MubWFwKChibG9jaywgaWR4KSA9PiB7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQ8ZGl2IGtleT17aWR4fT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9e3RoaXMuc3R5bGVzLmJsb2NrVGl0bGV9Pi0tIHtibG9jay50eXBlfTwvc3Bhbj5cblxuXHRcdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0XHR7dGhpcy5yZW5kZXJCbG9ja0l0ZW1zKGJsb2NrLml0ZW1zKX1cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT17J3JvdyAnICsgdGhpcy5zdHlsZXMud3JhcHBlcn0+XG5cdFx0XHRcdHt0aGlzLnJlbmRlckJsb2NrcygpfVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFZpZXdEaXNwbGF5OyJdfQ==
