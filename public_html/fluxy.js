"use strict";function _classCallCheck(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function _classCallCheck(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function _inherits(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}function _classCallCheck(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function _inherits(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}var _createClass=function(){function t(t,e){for(var a=0;a<e.length;a++){var i=e[a];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,a,i){return a&&t(e.prototype,a),i&&t(e,i),e}}(),Dispatcher=function(){function t(){_classCallCheck(this,t),this.isDispatching=!1,this._callbacks=[],this._lastID=0}return _createClass(t,[{key:"register",value:function(t){this._callbacks.push(t);var e=this._lastID+1;return this._lastID=e,e}},{key:"dispatch",value:function(t){this.isDispatching=!0,this._callbacks.forEach(function(e){e(t)}),this.isDispatching=!1}}]),t}(),appDispatcher=new Dispatcher,DataStore=function(){function t(e){_classCallCheck(this,t);var a=this;this.dispatchToken=e.register(function(t){a._onDispatch(t)}),this._data=this.getInitialState(),this._listeners={_:[]}}return _createClass(t,[{key:"getInitialState",value:function(){return{}}},{key:"addListener",value:function(t,e){var a=Math.floor(1e5*Math.random());return"function"==typeof t&&(e=t,t="_"),t||(t="_"),this._listeners[t]||(this._listeners[t]=[]),this._listeners[t].push({token:a,fn:e}),a}},{key:"removeListener",value:function(t,e){t||(t="_");var a=this._listeners[t].filter(function(t){return e!==t.token});this._listeners[t]=a}},{key:"_emitChange",value:function(t){var e=this;t&&t.forEach(function(t){e._listeners[t]&&e._listeners[t].forEach(function(t){t.fn()})}),this._listeners._.forEach(function(t){t.fn()})}},{key:"getAll",value:function(){return this._data}},{key:"_onDispatch",value:function(t){}}]),t}(),APP_ACTIONS={champion_update:function(t){return{actionType:"champion_update",champion:t}},update_itemset_title:function(t){return{actionType:"update_itemset_title",text:t}},update_itemset_block_type:function(t,e){return{actionType:"update_itemset_block_type",idx:t,text:e}},add_itemset_item:function(t,e){return{actionType:"add_itemset_item",idx:t,itemID:e}},select_map:function(t){return{actionType:"select_map",map:t}},remove_itemset_item:function(){},create_itemset_block:function(t){return{actionType:"create_itemset_block",blockObj:t}},delete_itemset_block:function(t){return{actionType:"delete_itemset_block",idx:t}},save_itemset:function(){return{actionType:"save_itemset"}},upload_itemset:function(t){return{actionType:"upload_itemset",data:t}},reset_all:function(){return{actionType:"reset_all"}},load_data:function(t){return{actionType:"load_data",id:t}},show_share:function(){return{actionType:"show_share"}},show_download:function(){return{actionType:"show_download"}},show_info:function(){return{actionType:"show_info"}},app_hide_popup:function(){return{actionType:"app_hide_popup"}},show_save_status:function(t){return{actionType:"show_save_status",status:t}},got_save_status:function(){return{actionType:"got_save_status"}}},_createClass=function(){function t(t,e){for(var a=0;a<e.length;a++){var i=e[a];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,a,i){return a&&t(e.prototype,a),i&&t(e,i),e}}(),_get=function(t,e,a){for(var i=!0;i;){var n=t,s=e,o=a;r=u=c=void 0,i=!1,null===n&&(n=Function.prototype);var r=Object.getOwnPropertyDescriptor(n,s);if(void 0!==r){if("value"in r)return r.value;var c=r.get;return void 0===c?void 0:c.call(o)}var u=Object.getPrototypeOf(n);if(null===u)return void 0;t=u,e=s,a=o,i=!0}},ItemSetStore=function(t){function e(t){_classCallCheck(this,e),_get(Object.getPrototypeOf(e.prototype),"constructor",this).call(this,t)}return _inherits(e,t),_createClass(e,[{key:"getInitialState",value:function(){return this._reset()}},{key:"_fetch",value:function(t,e){var a=new XMLHttpRequest;a.addEventListener("load",function(){var t=void 0;try{t=JSON.parse(this.responseText)}catch(a){t={status:"parse error "+a}}e(t)}),a.open("get","/itemset/"+t,!0),a.send()}},{key:"_save",value:function(t){var e=new XMLHttpRequest;e.addEventListener("load",function(){var e=void 0;try{e=JSON.parse(this.responseText)}catch(a){e={status:"parse error "+a}}t(e.id,e.status)}),e.open("post","/create/new",!0),e.setRequestHeader("Content-Type","application/json"),e.send(JSON.stringify(this._data))}},{key:"_reset",value:function(){return{id:0,showFileUpload:1,champion:{},description:"",itemset:{title:"",type:"custom",map:"any",mode:"any",priority:!1,sortrank:0,blocks:[{type:"Starting Items",recMath:!1,minSummonerLevel:-1,maxSummmonerLevel:-1,showIfSummonerSpell:"",hideIfSummonerSpell:"",items:[{id:2003,count:1}]}]}}}},{key:"_onDispatch",value:function(t){var e=this;switch(t.actionType){case"load_data":this._fetch(t.id,function(t){e._data=e._reset(),"ok"===t.status&&(e._data=t.data,e._emitChange(["id"]))});break;case"champion_update":this._data.champion=t.champion,this._emitChange(["champion"]);break;case"upload_itemset":this._data.showFileUpload=0,this._data.itemset=t.data,this._emitChange();break;case"select_map":this._data.itemset.map=t.map;break;case"update_itemset_title":this._data.itemset.title=t.text,this._emitChange();break;case"update_itemset_block_type":this._data.itemset.blocks[t.idx].type=t.text,this._emitChange();break;case"add_itemset_item":this._data.itemset.blocks[t.idx].items.push({id:parseInt(t.itemID),count:1}),this._emitChange();break;case"create_itemset_block":this._data.itemset.blocks.push(t.blockObj),this._emitChange();break;case"delete_itemset_block":this._data.itemset.blocks.splice(t.idx,1),this._emitChange();break;case"save_itemset":var a={valid:!0,reason:[]};if(this._data.champion.riotId||(a.valid=!1,a.reason.push("no-champion")),""==this._data.itemset.title&&(a.valid=!1,a.reason.push("no-title")),this._data.itemset.blocks.length||(a.valid=!1,a.reason.push("no-blocks")),a.valid)this._save(function(t,a){"ok"===a&&(e._data.id=t,e._emitChange(["id"]));var i={id:t,origin:"server",msg:a};appDispatcher.dispatch(APP_ACTIONS.show_save_status(i))});else{var i={origin:"app",msg:a.reason};appDispatcher.dispatch(APP_ACTIONS.show_save_status(i))}break;case"reset_all":this._data=this._reset(),this._emitChange(["id"])}}}]),e}(DataStore),itemSetStore=new ItemSetStore(appDispatcher),_createClass=function(){function t(t,e){for(var a=0;a<e.length;a++){var i=e[a];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}return function(e,a,i){return a&&t(e.prototype,a),i&&t(e,i),e}}(),_get=function(t,e,a){for(var i=!0;i;){var n=t,s=e,o=a;r=u=c=void 0,i=!1,null===n&&(n=Function.prototype);var r=Object.getOwnPropertyDescriptor(n,s);if(void 0!==r){if("value"in r)return r.value;var c=r.get;return void 0===c?void 0:c.call(o)}var u=Object.getPrototypeOf(n);if(null===u)return void 0;t=u,e=s,a=o,i=!0}},AppStore=function(t){function e(t){_classCallCheck(this,e),_get(Object.getPrototypeOf(e.prototype),"constructor",this).call(this,t)}return _inherits(e,t),_createClass(e,[{key:"getInitialState",value:function(){return this._reset()}},{key:"_reset",value:function(){return{showShare:0,showDownload:0,showInfo:0,saveStatus:""}}},{key:"_onDispatch",value:function(t){switch(t.actionType){case"show_share":this._data.showShare=1,this._emitChange();break;case"show_download":this._data.showDownload=1,this._emitChange();break;case"show_info":this._data.showInfo=1,this._emitChange();break;case"app_hide_popup":this._data=this._reset(),this._emitChange();break;case"show_save_status":this._data.saveStatus=t.status,this._emitChange(["saveStatus"]);break;case"got_save_status":this._data.saveStatus="",this._emitChange(["saveStatus"])}}}]),e}(DataStore),appStore=new AppStore(appDispatcher);