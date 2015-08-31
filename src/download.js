class Download extends React.Component {
	constructor() {
		super();
		this.styles = {
			wrapper: 'popup-wrapper',
			container: 'popup-container',

			inputJson: 'inputJson',
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

	renderDownload(json) {
		return (
		<div className='row'>
			<h3 className='xfont-thin'>Download</h3>
			<hr />
			<p>You can get this item build through two methods, one is by downloading it <a href={'/download/' + this.props.id + '.json'}>here</a>.</p>
			<p>
				Or the other method is creating a file with the name:
				<br />
				<i>{this.props.id}.json</i>
			</p>
			<p>
				Then copy and paste the below code into the file and save.
			</p>
			<textarea readOnly value={json} className={this.styles.inputJson}></textarea>
			<hr />
			<p>
				After you are done with either method, move the file into the appropriate champion folder where League Of Legends is installed.
			</p>
		</div>
		);
	}

	renderErr(err) {
		return (
			<div className='row'>
				<h3>There was an error</h3>
				<hr />
				<p>This is most likely a bug. Report it if possible (see About section).</p>

				<p>The specific error message is: {err.toString()}</p>
			</div>
		);
	}

	render() {
		if (!this.props.show) {
			return null;
		}

		let json, jsonErr;
		try {
			json = JSON.stringify(this.props.data);
		} catch(e) {
			jsonErr = e;
		}

		let message;
		if (jsonErr) {
			message = this.renderErr(jsonErr);
		} else {
			message = this.renderDownload(json);
		}

		return (
		<div className={this.styles.wrapper} onClick={this.removeShow.bind(this)}>
			<div className={this.styles.container}>
			
				{message}

			</div>
		</div>
		);
	}
}

export default Download;