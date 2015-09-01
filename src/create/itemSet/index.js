import ChampionSelect from './championSelect';
import ItemBlocks from './itemBlocks';
import ItemSetUpload from './upload';
import CreateBlock from './createBlock';
import MapSelect from './mapSelect';
import Share from '../../share';
import Download from '../../download';

var dragula = require('../../dragula/react-dragula');

class ItemSetWidget extends React.Component {

	constructor() {
		super();
		
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

	componentDidMount() {
		this.token = itemSetStore.addListener(this._onChange.bind(this));
		this.tokenSaveStatus = appStore.addListener('saveStatus', this._onSave.bind(this));

		const that = this;
		this.dr.containers.push(document.querySelector('#item-display'));

		// where items get added
		this.dr.on('drop', function(el, target, src) {
			const id = el.getAttribute('data-item-id');
			const idx = target.getAttribute('data-block-idx');
			if ((idx === 0 || idx ) && src.id == 'item-display' && target.id != 'item-display') {
				appDispatcher.dispatch(APP_ACTIONS.add_itemset_item(idx, id));
			} else if (src.id == 'item-display' && target.id =='create-block') {
				that.onCreateBlock([
					{ id: id, count: 1 }
				]);
			}
		});
	}

	componentWillUnmount() {
		itemSetStore.removeListener('', this.token);
		appStore.removeListener('saveStatus', this.tokenSaveStatus);
	}

	_onSave() {
		const saveStatus = appStore.getAll().saveStatus;
		// check if the save was successful & if it was really a save event
		if (saveStatus && saveStatus.id && saveStatus.msg === 'ok') {
			this.context.router.transitionTo('edit', {id: saveStatus.id});
		}
	}

	_onChange() {
		const data = itemSetStore.getAll();
		this.setState(data);
	}

	addDragContainer(el) {
		this.dr.containers.push(el);
	}

	changeTitle(event) {
		appDispatcher.dispatch(APP_ACTIONS.update_itemset_title(event.target.value));
	}

	changeType(blockIdx, txt) {
		appDispatcher.dispatch(APP_ACTIONS.update_itemset_block_type(blockIdx, txt));
	}

	changeMap(mapkey) {
		appDispatcher.dispatch(APP_ACTIONS.select_map(mapkey));
	}

	onCreateBlock(items, event) {
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

	onRemoveBlock(idx) {
		appDispatcher.dispatch(APP_ACTIONS.delete_itemset_block(idx));
	}
	
	onRemoveItem(rmItem) {
		appDispatcher.dispatch(APP_ACTIONS.delete_item_from_block(rmItem));
	}

	render() {
		return (
			<div className={'col-xs-6 col-sm-6 col-md-6' + this.styles.itemSetWrapper}>
			
				<Share id={this.state.id} show={this.props.showShare} />
				<Download show={this.props.showDownload} id={this.state.id} data={this.state.itemset} />

				<ItemSetUpload show={this.state.showFileUpload} />

				<br />

				<ChampionSelect handleChampionSelect={this.props.handleChampionSelect} apiVersion={this.props.apiVersion} champion={this.props.champion} />

				<br />
				<MapSelect map={this.state.itemset.map} handleChange={this.changeMap.bind(this)} />

				<br />
				<div className='row'>
					<input className='form-control' type='text' value={this.state.itemset.title} placeholder='Name your item set build' onChange={this.changeTitle.bind(this)} />
				</div>
				<br />

				<ItemBlocks addDrag={this.addDragContainer.bind(this)} blocks={this.state.itemset.blocks} handleBlockType={this.changeType.bind(this)} handleRemoveBlock={this.onRemoveBlock.bind(this)} handleItemRemove={this.onRemoveItem.bind(this)} />

				<CreateBlock addDrag={this.addDragContainer.bind(this)} handlerCreate={this.onCreateBlock.bind(this)} />

			</div>
		);
	}

}

ItemSetWidget.contextTypes = {
	router: React.PropTypes.func
}

export default ItemSetWidget;