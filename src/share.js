class Share extends React.Component {
	constructor() {
		super();
		
		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

		}
	}

	removeShow(buttonClick, event) {
		const remove = function() {
			appDispatcher.dispatch(APP_ACTIONS.app_hide_popup());
		}

		if (buttonClick.target) event = buttonClick;
		if (buttonClick === true) {
			remove();			
		} else {
			if (event.target && event.target.className === this.styles.wrapper) {
				remove();
			}
		}
	}

	render() {
		if (!this.props.show) {
			return null;
		}

		return (
		<div className={this.styles.wrapper} onClick={this.removeShow.bind(this)}>
			<div className={this.styles.container}>
				share
			</div>
		</div>
		);
	}
}

export default Share;