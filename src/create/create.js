import ItemDisplayWidget from './itemDisplay/index';
import ItemSetWidget from './itemSet/index';
import SaveResult from './saveResult';
import Share from '../share';
import Info from '../info';

class Create extends React.Component {

	constructor() {
		super();

		this.styles = {
			/*
			champSelectWrap: 'item-champ-select-wrap',
			champSelect: 'item-champ-select',
			championSelectBlock: 'item-champ-select-block'
			*/
		};

		this.state = itemSetStore.getAll()
		this.state.app = appStore.getAll();

		this.tokenChampion = 0;
		this.tokenSaveStatus = 0;
		this.tokenItemStore = 0;
		this.tokenAppStore = 0;
	}

	componentDidMount() {
		const that = this;

		this.tokenItemStore = ItemStore.notify(function() {
			that.setState({ items: ItemStore.items });
		});


		this.tokenChampion = itemSetStore.addListener('champion', this._onChange.bind(this));
		this.tokenSaveStatus = itemSetStore.addListener('saveStatus', this._onChange.bind(this));


		this.tokenAppStore = appStore.addListener(this._onAppChange.bind(this));

		// if we don't get an ID, we reset the item set store state
		// if we get an ID it means it's /edit which the store needs to load
		if (this.props.params && this.props.params.id) {
			appDispatcher.dispatch(APP_ACTIONS.load_data(this.props.params.id));
		} else {
			appDispatcher.dispatch(APP_ACTIONS.reset_all());
		}
	}

	componentWillUnmount() {
		ItemStore.unnotify(this.tokenItemStore);
		itemSetStore.removeListener('champion', this.tokenChampion);
		itemSetStore.removeListener('saveStatus', this.tokenSaveStatus);
		appStore.removeListener('', this.tokenAppStore);
	}

	_onChange() {
		const data = itemSetStore.getAll();
		this.setState({ champion: data.champion, saveStatus: data.saveStatus });
	}

	_onAppChange() {
		const data = appStore.getAll();
		this.setState({ app: data });		
	}

	onChampionSelect(championObj) {
		appDispatcher.dispatch(APP_ACTIONS.champion_update(championObj));
	}

	savePopUp() {
		if (this.state.saveStatus) {
			return (
				<SaveResult result={this.state.saveStatus} />
			);
		}
	}

	render() {
		return (			
			<div className='row'>
				{this.savePopUp()}
				<Share show={this.state.app.showShare} />
				<Info show={this.state.app.showInfo} />

				<ItemDisplayWidget items={this.state.items} />
				<ItemSetWidget apiVersion={this.props.apiVersion}  champion={this.state.champion} showDownload={this.state.app.showDownload} handleChampionSelect={this.onChampionSelect.bind(this)} />
			</div>
		);
	}

}

export default Create;
