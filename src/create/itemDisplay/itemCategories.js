/*
	Item categories filter for itemDisplay
 */

class ItemCategories extends React.Component {

	constructor() {
		super();

		this.handleChange = this.handleChange.bind(this);

		this.styles = {
			wrapper: 'item-category-wrap',
			parentCategory: 'category-wrap', // wrapper
			subCategory: 'sub-category-wrap xfont-thin', // wrapper
			parentCategoryTitle: 'xfont category-title text-center',
		};
	}

	/*
		When a sub category is clicked
	 */
	handleChange(event) {
		// [key, index for key] ie: categories['Starting Lane'][1] for Lane
		const categoryId = event.target.value.split(',');
		const categoryName = categoryId[0];
		const subCategory = parseInt(categoryId[1]);

		this.props.onCategoryCheck(categoryName, subCategory);
	}

	/*
		When a main category is clicked
	 */
	handleCategory(categoryName) {
		this.props.onCategoryCheck(categoryName);
	}

	renderSubCategories(categories, parentCategory) {
		return categories.map((cat, idx) => {
			return (
				<div key={cat.name} className={this.styles.subCategory}>
					<label>
						<input type='checkbox' value={[parentCategory, idx]} onChange={this.handleChange} checked={cat.checked} /> {cat.name}
					</label>
				</div>
			);
		});
	}
	
	renderCategories() {
		return Object.keys(this.props.categories).map(key => {
			const subCategories = this.props.categories[key];
			return (
				<div key={key} className={this.styles.parentCategory}>
					<span className={this.styles.parentCategoryTitle}><a href='#' onClick={this.handleCategory.bind(this, key)}>{key}</a></span>
					{this.renderSubCategories(subCategories, key)}
				</div>
			); 
		});
	}

	render() {
		return (
		<div className={this.styles.wrapper}>
			{this.renderCategories()}
		</div>
		);
	}

}

export default ItemCategories;