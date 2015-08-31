/*
	Search bar for itemDisplay
 */

class ItemSearch extends React.Component {

	constructor() {
		super();		
		this.styles = {
			wrapper: 'input-group input-group-sm',
			searchBar: 'form-control'
		};
	}

	handleSearch(event) {
		this.props.onSearch(event.target.value);
	}

  // why do i need to bind this.handleSearch and in the parent handler function? ES6 classes?
  // React auto did this for me with React.createClass
	render() {
		return (
		<div className={this.styles.wrapper}>
			<input className={this.styles.searchBar} type='text' placeholder='Search Items' onChange={this.handleSearch.bind(this)} value={this.props.searchValue} />
		</div>
		);
	}

}

export default ItemSearch;