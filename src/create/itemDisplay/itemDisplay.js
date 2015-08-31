/*
	Displays all available or filtered (by search or categories) items
 */

import ItemButton from '../../itemButton';

class ItemDisplay extends React.Component {

	constructor() {
		super();
		
		this.styles = {
			wrapper: 'item-display-wrap'
		};
	}

	renderItems() {
		return this.props.items.map(item => {
			return (
				<ItemButton key={item.id} item={item} />
			);
		});
	}

	render() {
		return (
		<div id='item-display' className={this.styles.wrapper}>
			{this.renderItems()}	
		</div>
		);
	}

}

export default ItemDisplay;