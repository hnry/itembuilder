class ViewBuild extends React.Component {

	constructor() {
		super();

		this.styles = {
			imageChampion: 'item-champion-image',
		}

		this.maps = [
			{ key: 'any', name: 'All Maps'},
			{ key: 'SR', name: 'Summoner\'s Rift'},
			{ key: 'HA', name: 'Howling Abyss'},
			{ key: 'TT', name: 'Twisted Treeline'},
			{ key: 'CS', name: 'Crystal Scar'}
		];
	}

	renderChampionImage() {
		if (!this.props.data.champion.riotKey) {
			return null;
		}
		return (<img className={this.styles.imageChampion} src={'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.data.champion.riotKey + '.png'} />);
	}

	getMapName() {
		let r;
		this.maps.forEach(map => {
			if (map.key === this.props.data.itemset.map) r = map.name;
		});
		return r;
	}

	render() {

		return (
			<div>
					


					<div className='row'>
						<div className=''>
							{this.renderChampionImage()}
						</div>
						<div className=''>
							<h3 className='xfont'>{this.props.data.champion.name}</h3>
							<br />
							{this.props.data.champion.title}
						</div>
					</div>
					<br />
					<br />
					{this.getMapName()}
			</div>
		);
	}

}

export default ViewBuild;