import ItemButton from '../itemButton';

class ViewDisplay extends React.Component {

	constructor() {
		super();

		this.styles = {
			wrapper: 'view-display',
			blockTitle: 'view-display-block-title xfont',
			itemButton: 'item-set-button-block',
			itemCount: 'item-set-button-block-count',
		}
	}

	renderBlockItems(items) {
		return items.map((item, idx) => {
			return (
				<div key={item.id + '-' + idx}>
					<div className={this.styles.itemButton}>
						<ItemButton itemId={item.id} />
						<span className={this.styles.itemCount}>{item.count}</span>
					</div>
				</div>
			);
		});
	}

	renderBlocks() {
		return this.props.itemset.blocks.map((block, idx) => {
			return (
				<div key={idx}>
					<span className={this.styles.blockTitle}>-- {block.type}</span>

					<div className='row'>
						{this.renderBlockItems(block.items)}
					</div>
				</div>
			);
		});
	}

	render() {
		return (
			<div className={'row ' + this.styles.wrapper}>
				<div className='col-xs-12 col-sm-12 col-md-12'>
				{this.renderBlocks()}
				</div>
			</div>
		);
	}

}

export default ViewDisplay;