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

	renderBlocks() {
		return this.state.itemset.blocks.map((block, idx) => {
			return (
				<div className='row' key={idx}>
					{block.type}


				</div>
			);
		});
	}

	render() {
		// have to check if resource exists 
		// if not render something different TODO
		return (
			<div className='row'>
				<Share show={this.state.app.showShare} />
				<Download show={this.state.app.showDownload} data={this.state.itemset} id={this.state.id} />
				<Info show={this.state.app.showInfo} />

				<div className='col-xs-5 col-sm-5 col-md-5'>
					{this.renderBlocks()}
				</div>
				<div className='col-xs-5 col-sm-5 col-md-5'>
					{this.state.itemset.title}
					<br />
					{this.state.champion.name}
					<br />
					champion pic
					<br />
					map info
				</div>
			</div>
		);
	}

}

export default View;