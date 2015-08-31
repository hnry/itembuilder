import ViewBuild from './viewBuild';
import ViewDisplay from './viewDisplay';
import ItemButton from '../itemButton';

import Share from '../share';
import Download from '../download';
import Info from '../info';

class View extends React.Component {

	constructor() {
		super();
		
		this.styles = {};

		this.state = itemSetStore.getAll();
		this.state.app = appStore.getAll();

		this.tokenItemSetStore = 0;
		this.tokenAppStore = 0;
	}

	componentDidMount() {
		this.tokenItemSetStore = itemSetStore.addListener(this._onChange.bind(this));
		this.tokenAppStore = appStore.addListener(this._onAppChange.bind(this));

		// TODO could do some quick ID validation
		// to detect obvious bad IDs and not bother loading..
		appDispatcher.dispatch(APP_ACTIONS.load_data(this.props.params.id));
	}

	componentWillUnmount() {
		itemSetStore.removeListener('', this.tokenItemSetStore);
		appStore.removeListener('', this.tokenAppStore);
	}

	_onChange() {
		const data = itemSetStore.getAll();
		this.setState(data);
	}
	
	_onAppChange() {
		const data = appStore.getAll();
		this.setState({ app: data });
	}

	render() {
		// have to check if resource exists 
		// if not render something different TODO
		return (
			<div className='row'>

				<Share id={this.state.id} show={this.state.app.showShare} />
				<Download show={this.state.app.showDownload} data={this.state.itemset} id={this.state.id} />
				<Info show={this.state.app.showInfo} />

					<div className='row'>
						<h2 className='xfont-thin'>{this.state.itemset.title}</h2>
					</div>
					<hr />

				<div className='col-xs-5 col-sm-5 col-md-5'>
					<ViewDisplay itemset={this.state.itemset} />
				</div>
				<div className='col-xs-5 col-sm-5 col-md-5 col-xs-offset-1 col-sm-offset-1 col-md-offset-1'>
					<ViewBuild apiVersion={this.props.apiVersion} data={this.state} />
				</div>

			</div>
		);
	}

}

export default View;