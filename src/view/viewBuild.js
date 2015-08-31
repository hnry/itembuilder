class ViewBuild extends React.Component {

	constructor() {
		super();

		this.styles = {
			imageChampion: 'item-champion-image',
		}
	}

	renderChampionImage() {
		if (!this.props.data.champion.riotKey) {
			return null;
		}
		return (<img className={this.styles.imageChampion} src={'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.data.champion.riotKey + '.png'} />);
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
					map info
			</div>
		);
	}

}

export default ViewBuild;