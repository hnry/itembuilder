import ChampionSelect from './championSelect';
import ItemBlocks from './itemBlocks';
import ItemSetUpload from './upload';
import CreateBlock from './createBlock';
import MapSelect from './mapSelect';
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

		this.dr = dragula({
			copy: false
		});
	}

	componentDidMount() {
		this.token = itemSetStore.addListener(this._onChange.bind(this));

		const that = this;
		this.dr.containers.push(document.querySelector('#item-display'));

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
	}

	_onChange() {
		this.setState(itemSetStore.getAll());
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
	
	render() {
		return (
			<div className={'col-xs-6 col-sm-6 col-md-6' + this.styles.itemSetWrapper}>
			
				<Download show={this.props.showDownload} id={this.state.id} data={this.state.itemset} />

				<ItemSetUpload show={this.state.showFileUpload} />

				<br />

				<ChampionSelect handleChampionSelect={this.props.handleChampionSelect} apiVersion={this.props.apiVersion} champion={this.props.champion} />


				<MapSelect />

				<br />
				<div className='row'>
					<input className='form-control' type='text' value={this.state.itemset.title} placeholder='Name your item set build' onChange={this.changeTitle.bind(this)} />
				</div>
				<br />

				<ItemBlocks addDrag={this.addDragContainer.bind(this)} blocks={this.state.itemset.blocks} handleBlockType={this.changeType.bind(this)} handleRemoveBlock={this.onRemoveBlock.bind(this)} />

				<CreateBlock addDrag={this.addDragContainer.bind(this)} handlerCreate={this.onCreateBlock.bind(this)} />

			</div>
		);
	}

}

export default ItemSetWidget;