class ViewBuild extends React.Component {

	constructor() {
		super();

		this.styles = {

		}
	}

	renderChampionImage() {
		if (!this.props.data.champion.riotKey) {
			return null;
		}
		return (<img src={'http://ddragon.leagueoflegends.com/cdn/' + this.props.apiVersion + '/img/champion/' + this.props.data.champion.riotKey + '.png'} />);
	}

	render() {
		return (
			<div>
					{this.props.data.itemset.title}
					<br />
					{this.renderChampionImage()}
					{this.props.data.champion.name}
					<br />
					<br />
					map info
			</div>
		);
	}

}

export default ViewBuild;