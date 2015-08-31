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

		if (buttonClick) {
			remove();			
		} else {
			if (event.target.className === this.styles.wrapper) {
				remove();
			}
		}
	}
	
	render() {
		const result = this.props.result;

		let glyph = 'glyphicon glyphicon-remove';
		let color = this.styles.red;
		if (result.msg === 'ok') {
			color = this.styles.green;
			glyph = 'glyphicon glyphicon-ok';
		}

		let message = 'TODO write some stuff';

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