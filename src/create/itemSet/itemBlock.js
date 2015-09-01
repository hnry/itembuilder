import ItemButton from '../../itemButton';

class ItemBlock extends React.Component {

	constructor() {
		super();
		this.styles = {
			itemBlock: 'item-block',
			item_block_title: 'item-set-block-title',
			item_icon_block: 'item-set-button-block',
			item_icon_count: 'item-set-button-block-count',
		};
	}
	
	componentDidMount() {
		this.props.addDrag(this.refs.drag.getDOMNode());
	}

	changeType(id, idx, event) {
		console.log(id);
		this.props.handleBlockType(idx, event.target.value);
	}

	onRemoveBlock(idx) {
		this.props.handleRemoveBlock(idx);
	}

	onRemoveItem(rmItem, event) {
		event.preventDefault();
		this.props.handleItemRemove(rmItem);
	}

	renderItems(items) {
		return items.map((item, idx) => {
			// for item remove
			const rmItem = { 
				blockIdx: this.props.idx,
				itemIdx: idx,
				itemId: item.id
			}
			return (
				<div onContextMenu={this.onRemoveItem.bind(this, rmItem)} key={item.id + '-' + idx} className={this.styles.item_icon_block}>
					<ItemButton itemId={item.id} />
					<span className={this.styles.item_icon_count}>{item.count}</span>
				</div>
			);
		});
	}

	render() {
		return (
		<div className={'row ' + this.styles.itemBlock}>

			<div className={'row ' + this.styles.item_block_title}>
				<div className='col-xs-10 col-sm-10 col-md-10'>
					<div className='input-group input-group-sm'>
						<input className='form-control' type='text' value={this.props.block.type} onChange={this.changeType.bind(this, this.props.block.id, this.props.idx)} placeholder='explain this item row' />
						<div className='input-group-addon'>
							<span className="glyphicon glyphicon-pencil" aria-hidden="true"></span>
						</div>
					</div>
				</div>

				<div className='col-xs-1 col-sm-1 col-md-1'>
					<span className="glyphicon glyphicon-remove" onClick={this.onRemoveBlock.bind(this, this.props.idx)}></span>
				</div>
			</div>

			<div className='row'>
				<div ref='drag' data-block-idx={this.props.idx} className='col-xs-12 col-sm-12 col-md-12 drag-container'>
					{this.renderItems(this.props.block.items)}
				</div>
			</div>

		</div>
		);
	}

}

export default ItemBlock;