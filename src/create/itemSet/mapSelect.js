class MapSelect extends React.Component {
	constructor() {
		super();
		this.maps = [
			{ key: 'any', name: 'All Maps'},
			{ key: 'SR', name: 'Summoner\'s Rift'},
			{ key: 'HA', name: 'Howling Abyss'},
			{ key: 'TT', name: 'Twisted Treeline'},
			{ key: 'CS', name: 'Crystal Scar'}
		];
	}

	renderMapOptions() {
		return this.maps.map(map => {
			return (<option key={map.key} value={map.key}>{map.name}</option>);
		});
	}

	onChange(event) {
		this.props.handleChange(event.target.value);
	}

	render() {
		return (
				<div className='row'>
					<label>Map: </label>
					<select onChange={this.onChange.bind(this)} value={this.props.map}>
						{this.renderMapOptions()}
					</select>
				</div>
		);
	}
}

export default MapSelect;