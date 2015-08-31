class ChampionSelect extends React.Component {

	constructor() {
		super();

		this.searchChampions = this.searchChampions.bind(this);
		
		this.styles = {
			championDropDownWrap: 'item-champion-dropdown-wrap',
			championDropDown: 'item-champion-dropdown',
			hide: 'hidden',
		};

		this.state = {
			searchValue: '',
			showDropDown: false
		};
	}

	onDropDown(bool, event) {
		const that = this;
		const set = function() {
			that.setState({ showDropDown: bool });
		}

		// hacky way to get mouse clicks to trigger first before onBlur
		if (!bool) {
			setTimeout(set, 200);
		} else {
			set();
		}
	}

	searchChampions(event) {
		this.setState({ searchValue: event.target.value });
	}
	
	/* 
		When user presses enter, we need to verify if the champion actually exists
		Do nothing if it does not
	*/
	handleSubmit(event) {
		if (event.which === 13) { // enter
			const input = event.target.value.toLowerCase();
			const champ = ChampionData.filter(champion => {
				return champion.name.toLowerCase() === input || champion.riotKey.toLowerCase() === input;
			});

			if (champ.length) {
				this.onChampionSelect(champ[0]);
			}
		}
	}

	onChampionSelect(champion) {
		this.props.handleChampionSelect(champion);
	}

	renderSearchResultsItems() {
		const searchTerm = this.state.searchValue.toLowerCase();
		let champions = ChampionData;

		// first filter by search		
		if (searchTerm) {
			champions = ChampionData.filter(champ => {
				const name = champ.name.toLowerCase();
				const keyname = champ.riotKey.toLowerCase();
				return name.indexOf(searchTerm) === 0 || keyname.indexOf(searchTerm) == 0;
			});
		}

		// sort by name / first letter of name
		champions.sort(function(a, b) {
			const aa = a.name[0].charCodeAt();
			const bb = b.name[0].charCodeAt();
			if (aa > bb) {
				return 1;
			} else if (bb > aa) {
				return -1;
			} else {
				return 0;
			}
		});
		
		// we only show the first 10 of the results
		let championslimit = champions.slice(0, 10);

		return championslimit.map(champion => {
			return (
				<li key={champion.riotId} onClick={this.onChampionSelect.bind(this, champion)}>
					<img src={'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + champion.riotKey + '.png'} />
					<span>{champion.name}</span>
				</li>
			);
		});
	}

	renderSearchResults() {
		let cls = this.styles.championDropDownWrap;
		if (!this.state.showDropDown) {
			cls += ' ' + this.styles.hide;
		}

		return (
			<div className={cls}>
				<ul className={this.styles.championDropDown}>
					{this.renderSearchResultsItems()}
				</ul>
			</div>
		);
	}

	render() {
		let imageUrl = 'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.champion.riotKey + '.png';
		let renderPickerOrChampion = (<h2>{this.props.champion.name}</h2>);

		if (!this.props.champion.riotId) {
			imageUrl = 'http://ddragon.leagueoflegends.com/cdn/5.2.1/img/ui/champion.png';
			// render the champion picker
			renderPickerOrChampion = (
					<div onBlur={this.onDropDown.bind(this, false)}>
					<input type='text' placeholder='Pick a Champion for this build' value={this.state.searchValue} onChange={this.searchChampions} onFocus={this.onDropDown.bind(this, true)} onKeyUp={this.handleSubmit.bind(this)} onKeyDown={this.handleSubmit.bind(this)} />
					{this.renderSearchResults()}
					</div>
			);
		}

		return (
			<div className='row'>
				<img src={imageUrl} />
				{renderPickerOrChampion}
			</div>
		);
	}

}

export default ChampionSelect;