class ItemSetUpload extends React.Component {

	constructor() {
		super();

		this.styles = {
			errDisplay: 'upload-error'
		}

		this.handleUpload = this.handleUpload.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);

		this.clearErrTimer = 0;
		this.state = {
			error: ''
		}
	}

	validateParsed(parsedJson) {
		// TODO validate
		// ...
		
		// once validated save to store
		appDispatcher.dispatch(APP_ACTIONS.upload_itemset(parsedJson));
	}

	handleError(err, filename) {
		let error = 'Unable to parse this file, it maybe not valid';
		switch (err.toString()) {
			case 'toobig':
				error = 'The file\'s size is too big and may not be valid'
				break;
		}

		this.setState({ error: filename + ': ' + error });
	}

	clearError() {
		if (this.clearErrTimer) {
			clearInterval(this.clearErrTimer);
		}
		this.setState({ error: '' });
	}

	handleUpload(event) {
		const that = this;
    var reader = new FileReader();
    var file = event.target.files[0];

    if (file.size > 15000) {
    	this.handleError('toobig', file.name);
    	return;
    }

    reader.onload = function(upload) {
    	let parsed;
    	let err = '';
	    try {
		    parsed = JSON.parse(upload.target.result)
		  } catch(e) {
		  	err = e;
		  }
		  if (err || !parsed) {
		  	that.handleError(err, file.name);
		  } else {
		  	that.validateParsed(parsed);
		  }
		  const el = React.findDOMNode(that.refs.inputElem);
		  if (el) el.value = '';
    }
  	reader.readAsText(file);
  }

	handleSubmit(event) {
		event.preventDefault();
	}

	render() {
		// don't show the upload form if user already uploaded
		if (!this.props.show) {
			return null;
		}
		
		let error;
		// fade away errors
		if (this.state.error) {
			// if there's a previous timer, stop it first
			if (this.clearErrTimer) {
				clearInterval(this.clearErrTimer);
			}
			error = (<span className={this.styles.errDisplay} onClick={this.clearError.bind(this)}>{this.state.error}</span>);
			this.clearErrTimer = setTimeout(this.clearError.bind(this), 2500);
		}

		return (
			<div>
			<small>Import an existing Item Set</small>
			<form onSubmit={this.handleSubmit} encType="multipart/form-data">
				<input ref='inputElem' type='file' accept='.json' onChange={this.handleUpload} />
			</form>
			{error}
			</div>
		);
	}

}

export default ItemSetUpload;	
