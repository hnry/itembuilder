/*
	onHover and display Item icon image
 */

class ItemButton extends React.Component {

	constructor() {
		super();
		
		this.styles = {
			popupHide: 'item-pop-hide',
			popupShow: 'item-pop-show',
			popup: 'item-pop'
		};

		this.state = {
			popup: false,
			item: {}
		};

		this.token = 0;
	}

	componentDidMount() {
		let item;
		const that = this;

		this.token = ItemStore.notify(function() {
			if (that.props.item) {
				item = that.props.item;
			} else {
				item = ItemStore.getById(that.props.itemId);
			}
			that.setState({ item: item });		
		});
	}

	componentWillUnmount() {
		ItemStore.unnotify(this.token);
	}

	handleHoverOn() {
		//console.log(this.state.item);
		this.setState({ popup: true });
	}

	handleHoverOff() {
		this.setState({ popup: false });
	}

	render() {
		if (!this.state.item || Object.keys(this.state.item).length < 1) {
			return null;
		}
		
		let popUpDisplay = this.styles.popupHide;
		if (this.state.popup) popUpDisplay = this.styles.popupShow;

		return (
		<div data-item-id={this.state.item.id}>
			<img src={this.state.item.getImage()} onMouseEnter={this.handleHoverOn.bind(this)} onMouseLeave={this.handleHoverOff.bind(this)} />

			<div className={'row ' + this.styles.popup + ' ' + popUpDisplay}>
				{this.state.item.name}
				<br />
				{this.state.item.description}
				<br />
				{this.state.item.gold.base} <img src='http://ddragon.leagueoflegends.com/cdn/5.5.1/img/ui/gold.png' />
			</div>

		</div>
		);
	}

}

export default ItemButton;