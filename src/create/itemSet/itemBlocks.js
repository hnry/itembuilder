import ItemBlock from './itemBlock';

class ItemBlocks extends React.Component {

	constructor() {
		super();
	}

	render() {
		const renderBlocks = this.props.blocks.map((block, idx) => {
			return (
				<ItemBlock key={block.id + '-' + idx} block={block} idx={idx} addDrag={this.props.addDrag} handleBlockType={this.props.handleBlockType} handleRemoveBlock={this.props.handleRemoveBlock} />
			);
		});

		return (
			<div>
				{renderBlocks}
			</div>
		);
	}

}

export default ItemBlocks;	
