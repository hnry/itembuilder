var dragula = require('react-dragula');

class CreateBlock extends React.Component {

	constructor() {
		super();

		this.styles = {
			itemBlock: 'item-block',
			item_block_add: 'item-set-add-block'
		}
	}

	componentDidMount() {
		this.props.addDrag(this.refs.drag.getDOMNode());
	}

	render() {
		return (
		<div ref='drag' id='create-block' className={'row ' + this.styles.itemBlock} onClick={this.props.handlerCreate}>
			<div className={this.styles.item_block_add}>
				Drag Items Here to Create a New Block
			</div>
		</div>	
		);
	}

}

export default CreateBlock;	
