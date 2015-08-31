var APP_ACTIONS = {
	champion_update: function(championObj) {
		return {
			actionType: 'champion_update',
			champion: championObj
		}
	},
	update_itemset_title: function(text) {
		return {
			actionType: 'update_itemset_title',
			text: text
		};
	},
	update_itemset_block_type: function(idx, text) {
		return {
			actionType: 'update_itemset_block_type',
			idx: idx,
			text: text
		};
	},
	add_itemset_item: function(blockidx, id) {
		return {
			actionType: 'add_itemset_item',
			idx: blockidx,
			itemID: id
		}
	},
	remove_itemset_item: function() {

	},
	create_itemset_block: function(initBlock) {
		return {
			actionType: 'create_itemset_block',
			blockObj: initBlock
		}
	},
	delete_itemset_block: function(idx) {
		return {
			actionType: 'delete_itemset_block',
			idx: idx
		}
	},
	save_itemset: function() {
		return {
			actionType: 'save_itemset'
		}
	},
	got_save_status: function() {
		return {
			actionType: 'got_save_status'
		}
	},
	upload_itemset: function(jsonData) {
		return {
			actionType: 'upload_itemset',
			data: jsonData
		}
	},
	reset_all: function() {
		return {
			actionType: 'reset_all'
		}
	},
	load_data: function(id) {
		return {
			actionType: 'load_data',
			id: id
		}
	},

	/*
		appStore actions
	 */
	show_share: function() {
		return {
			actionType: 'show_share'
		}
	},
	show_download: function() {
		return {
			actionType: 'show_download'
		}
	},
	show_info: function() {
		return {
			actionType: 'show_info'
		}
	},
	app_hide_popup: function() {
		return {
			actionType: 'app_hide_popup'
		}
	}
}