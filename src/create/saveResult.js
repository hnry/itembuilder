class SaveResult extends React.Component {

	constructor() {
		super();
		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

			componentContainer: 'save-result-container',
			icon: 'save-result-icon',
			message: 'save-result-message',
			removeButton: 'save-result-button',
			green: 'font-green',
			red: 'font-red'
		};
	}

	removePopup(buttonClick, event) {
		const remove = function() {
			appDispatcher.dispatch(APP_ACTIONS.got_save_status());
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
		if (!this.props.result) {
			return null;
		}

		const result = this.props.result;
		let message = '';

		let glyph = 'glyphicon glyphicon-remove';
		let color = this.styles.red;
		if (result.msg === 'ok') {
			color = this.styles.green;
			glyph = 'glyphicon glyphicon-ok';
			message = 'Your Item Build has been saved. Head over to Download to get it on your computer, or Share to show others your amazing build!';
		} else {
			message = 'Your Item Build is missing something, (more details to come)';
		}

		return (
			<div className={this.styles.wrapper} onClick={this.removePopup.bind(this, false)}>
				<div className={this.styles.container}>

				<div className={this.styles.componentContainer}>
					<div className={color + ' ' + this.styles.icon}>
						<span className={glyph}></span>
					</div>

					<div className={this.styles.message}>
						{message}
					</div>

					<div className={this.styles.removeButton}>
						<button onClick={this.removePopup.bind(this, true)}>Got it</button>
					</div>
				</div>

				</div>
			</div>
		);
	}

}

export default SaveResult;