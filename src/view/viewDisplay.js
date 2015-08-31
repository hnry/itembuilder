import ItemButton from '../itemButton';

class ViewDisplay extends React.Component {

	constructor() {
		super();

		this.styles = {
			wrapper: 'view-display',
			blockTitle: 'view-display-block-title xfont',

		}
	}

	renderBlockItems(items) {
		return items.map((item, idx) => {
			return (
				<div key={item.id + '-' + idx}>
					<ItemButton itemId={item.id} />
					<span>{item.count}</span>
				</div>
			);
		});
	}

	renderBlocks() {
		return this.props.itemset.blocks.map((block, idx) => {
			return (
				<div key={idx}>
					<span className={this.styles.blockTitle}>-- {block.type}</span>

					<div>
						{this.renderBlockItems(block.items)}
					</div>
				</div>
			);
		});
	}

	render() {
		return (
			<div className={'row ' + this.styles.wrapper}>
				{this.renderBlocks()}
			</div>
		);
	}

}

export default ViewDisplay;