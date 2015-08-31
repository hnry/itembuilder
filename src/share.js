class Share extends React.Component {
	constructor() {
		super();
		
		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

			shareContainer: 'share-modal'
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
		// TODO
		// if using HTML5 fallback (/#/)
		// this.context.router.makeHref returns #/
		// so have to prepend a '/' in this case
		const link = 'http://' + window.location.host + this.context.router.makeHref('view', { id: this.props.id });

		if (!this.props.show) {
			return null;
		}

		return (
		<div className={this.styles.wrapper} onClick={this.removeShow.bind(this)}>
			<div className={this.styles.container}>
			
			<div className={this.styles.shareContainer}>
				<h3 className='xfont-thin'>Share</h3>
				<hr />
				Share your item build with others using this link:
				<br />
				<input type='text' defaultValue={link} readOnly />
				<br />
				<br />
				Or share it on your social media,
			</div>

			</div>
		</div>
		);
	}
}

Share.contextTypes = {
	router: React.PropTypes.func
}

export default Share;