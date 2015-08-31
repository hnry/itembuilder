class Info extends React.Component {
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

		if (buttonClick) {
			remove();			
		} else {
			if (event.target.className === this.styles.wrapper) {
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
				
				<div>
							Item Builder isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
				</div>

			</div>
		</div>
		);
	}
}

export default Info;
