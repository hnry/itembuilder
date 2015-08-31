import ItemDisplayWidget from './itemDisplay/index';
import ItemSetWidget from './itemSet/index';
import SaveResult from './saveResult';
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
		this.tokenItemSet = 0;
		this.tokenItemStore = 0;
		this.tokenAppStore = 0;
	}

	static willTransitionTo(transition, context) {
		if (transition.path.indexOf('/edit/') === 0) {
			appDispatcher.dispatch(APP_ACTIONS.load_data(context.id));
		} else if (transition.path.indexOf('/create') === 0 || transition.path == '/') {
			appDispatcher.dispatch(APP_ACTIONS.reset_all());
		}
	}

	componentDidMount() {
		const that = this;

		this.tokenItemStore = ItemStore.notify(function() {
			that.setState({ items: ItemStore.items });
		});


		this.tokenChampion = itemSetStore.addListener('champion', this._onChange.bind(this));
		this.tokenItemSet = itemSetStore.addListener('id', this._onChange.bind(this));


		this.tokenAppStore = appStore.addListener(this._onAppChange.bind(this));
	}

	componentWillUnmount() {
		ItemStore.unnotify(this.tokenItemStore);
		itemSetStore.removeListener('champion', this.tokenChampion);
		itemSetStore.removeListener('id', this.tokenItemSet);
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

	render() {
		return (			
			<div className='row'>
				<SaveResult result={this.state.app.saveStatus} />
				<Info show={this.state.app.showInfo} />

				<ItemDisplayWidget items={this.state.items} />
				<ItemSetWidget apiVersion={this.props.apiVersion}  champion={this.state.champion} showDownload={this.state.app.showDownload} showShare={this.state.app.showShare} handleChampionSelect={this.onChampionSelect.bind(this)} />
			</div>
		);
	}

}

export default Create;
