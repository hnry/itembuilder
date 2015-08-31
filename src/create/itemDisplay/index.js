import ItemCategories from './itemCategories';
import ItemDisplay from './itemDisplay';
import ItemSearch from './itemSearch';

const getBaseCategories = function() {
	const baseCategories = {
				'All Items': [],
				'Starting Items': [
					{ name: 'Jungle', tags: ['Jungle'], checked: false }, 
					{ name: 'Lane', tags: ['Lane'], checked: false }
				],
				'Tools': [
					{ name: 'Consumable', tags: ['Consumable'], checked: false }, 
					{ name: 'Gold Income', tags: ['GoldPer'], checked: false }, 
					{ name: 'Vision & Trinkets', tags: ['Vision', 'Trinket'], checked: false }
				],
				'Defense': [
					{ name: 'Armor', tags: ['Armor'], checked: false },
					{ name: 'Health', tags: ['Health'], checked: false }, 
					{ name: 'Health Regen', tags: ['HealthRegen'], checked: false }
				],
				'Attack': [
					{ name: 'Attack Speed', tags: ['AttackSpeed'], checked: false }, 
					{ name: 'Critical Strike', tags: ['CriticalStrike'], checked: false }, 
					{ name: 'Damage', tags: ['Damage'], checked: false }, 
					{ name: 'Life Steal', tags: ['LifeSteal', 'SpellVamp'], checked: false }
				],
				'Magic': [
					{ name: 'Cooldown Reduction', tags: ['CooldownReduction'], checked: false }, 
					{ name: 'Mana', tags: ['Mana'], checked: false }, 
					{ name: 'Mana Regen', tags: ['ManaRegen'], checked: false }, 
					{ name: 'Ability Power', tags: ['SpellDamage'], checked: false }
				],
				'Movement': [
					{ name: 'Boots', tags: ['Boots'], checked: false }, 
					{ name: 'Other Movement', tags: ['NonbootsMovement'], checked: false }
				]
	};
	return baseCategories;
}

class ItemDisplayWidget extends React.Component {

	constructor() {
		super();
		
		this.styles = {
			itemDisplayWrapper: ' item-display-box-wrap',
		};

		this.state = { categories: getBaseCategories(), search: ''};
	}

	changeCategories(categoryName, subCategory) {
		let cats = [];
		let categories = this.state.categories;

		if (typeof subCategory === 'undefined') {
			// reset all checks when a parent category is clicked
			// 
			// TODO! this makes it set a bunch of AND tags to filter
			// we want OR, we might not even want this code here...
			categories = getBaseCategories();
			cats = Array.apply(0, Array(categories[categoryName].length)).map((x, y) => y);
		} else {
			cats.push(subCategory);
		}

		// hacky and too strict and literal, but whatever
		if (categoryName !== 'All Items') {
			cats.forEach(cat => {
				const c = categories[categoryName][cat];
				(c.checked) ? c.checked = false : c.checked = true;
			});
		}

		this.setState({ categories: categories, search: '' });
	}

	changeSearch(searchTerm) {
		this.setState({ search: searchTerm, categories: getBaseCategories() });
	}

	/*
		Returns items filtered by search or category or none

		TODO!!!
		filterTags with categories with more than 1 tag causes a AND condition
		but it should be an OR condition Jungle and Vision & Trinket
		means it matches [jungle, vision, trinket]
		but it should be [jungle] and [vision OR trinket]
	 */
	getItems() {
		if (!this.props.items) {
			return [];
		}
		// we could just leave filterBy as 'search' by default
		// since it will also return all items if search === ''
		// but i figure it will be more performant if there is no indexOf check
		// for every item
		let filterBy;
		let filterTags = [];

		// check if it's by search first to avoid looping categories for tags
		if (this.state.search && this.state.search !== '') {
			filterBy = 'search';
		} else {
			Object.keys(this.state.categories).forEach(key => {
				this.state.categories[key].forEach(cat => {
					if (cat.checked) {
						cat.tags.forEach(tag => filterTags.push(tag));
					}
				});
			});

			if (filterTags.length) filterBy = 'tags';
		}

		return Object.keys(this.props.items).reduce((r, itemID) => {
			const item = this.props.items[itemID];
			// filter by search or tags or none
			if (filterBy === 'search') {
				if (item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1) {
					r.push(item);
				} else {
					// also use search term on tags
					const result = item.tags.filter(tag => {
						return tag.toLowerCase() === this.state.search.toLowerCase()
					});
					if (result.length) r.push(item);
				}

			} else if (filterBy === 'tags') {
				// have to have every tag in filterTags
				const result = filterTags.filter(fTag => {
					return item.tags.filter(iTag => {
						// we lowercase check just in case riot api data
						// isn't uniformed and has some tags with weird casing
						return fTag.toLowerCase() === iTag.toLowerCase();
					}).length;
				});
				if (result.length === filterTags.length) r.push(item);

			} else {
				r.push(item);
			}
			
			return r;
		}, []);
	}

	render() {
		return (
			<div className={'col-xs-5 col-sm-5 col-md-5' + this.styles.itemDisplayWrapper}>
				<div className='row'>
					<div className='col-xs-12 col-sm-12 col-md-12'>
						<ItemSearch searchValue={this.state.search} onSearch={this.changeSearch.bind(this)} />
					</div>
				</div>

				<div className='row'>
					<div className='col-xs-7 col-sm-7 col-md-7'>
						<ItemCategories categories={this.state.categories} onCategoryCheck={this.changeCategories.bind(this)} />
					</div>
					<div className='col-xs-5 col-sm-5 col-md-5'>
						<ItemDisplay items={this.getItems()} />
					</div>
				</div>

			</div>
		);
	}

}

export default ItemDisplayWidget;