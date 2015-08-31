var Router = window.ReactRouter;
var DefaultRoute = Router.DefaultRoute;
var Route = Router.Route;
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;

import Create from './create/create';
import View from './view/view';

var App = React.createClass({

	styles: {
		disableNav: 'disable'
	},

	getInitialState: function() {
		const initID = itemSetStore.getAll();

		return {
			apiVersion: '5.16.1',
			id: initID.id,
		};
	},

	componentDidMount: function() {
		// gets alerted on every save attempt, even for fail saves
		itemSetStore.addListener('id', this._onChange);
	},

	_onChange: function() {
		const data = itemSetStore.getAll();
		this.setState({ id: data.id });
	},

	mixins: [Router.State],

	_onNavSave: function(e) {
		appDispatcher.dispatch(APP_ACTIONS.save_itemset());
		return false;
	},

	_onNavDownload: function(e) {
		e.stopPropagation();
		appDispatcher.dispatch(APP_ACTIONS.show_download());
		return false;
	},

	_onNavShare: function(e) {
		e.stopPropagation();
		appDispatcher.dispatch(APP_ACTIONS.show_share());
		return false;
	},

	_onNavInfo: function(e) {
		e.stopPropagation();
		appDispatcher.dispatch(APP_ACTIONS.show_info());
		return false;
	},


	renderLinks: function(link, glyph, name) {			
		/*
			The mode we are in depends on if we have document ID for an itemset
			Different links for different modes
			There is a view mode
			And a create mode
		 */
		const id = this.state.id;

		const viewLinks = [
			{ url: 'create', glyph: 'glyphicon-file', text: 'New' },
			{ url: 'edit', params: id, glyph: 'glyphicon-pencil', text: 'Edit' },			
			{ url: 'view', params: id, onClick: this._onNavDownload, glyph: 'glyphicon-save', text: 'Download' },
			{ url: 'view', params: id, onClick: this._onNavShare, glyph: 'glyphicon-share', text: 'Share' },
			{ url: 'view', params: id, onClick: this._onNavInfo, glyph: 'glyphicon-equalizer', text: 'About' },
		];
		let createLinks = [
			{ url: 'create', glyph: 'glyphicon-file', text: 'New' },
			{ url: 'create', onClick: this._onNavSave, glyph: 'glyphicon-ok', text: 'Save' },
			// the rest of these links only available if saved
			{ url: 'view', params: id, glyph: 'glyphicon-unchecked', text: 'View', needID: true },
			{ url: 'create', onClick: this._onNavDownload, glyph: 'glyphicon-save', text: 'Download', needID: true },
			{ url: 'create', onClick: this._onNavShare, glyph: 'glyphicon-share', text: 'Share', needID: true },
			{ url: 'create', onClick: this._onNavInfo, glyph: 'glyphicon-equalizer', text: 'About' },
		];

		let mode = createLinks;
		if (this.isActive('view')) {
			mode = viewLinks;
		}

		return mode.map(link => {
			const inner = (
					<div>
					<div className='sidebar-icon'>
						<span className={'glyphicon ' + link.glyph}></span>
					</div>
					<span>{link.text}</span>
					</div>
			);

			let r;

			// disable certain menu options when we don't
			// have an ID
			if (link.needID && !this.state.id) {
					r = (
						<div className={this.styles.disableNav}>
						{inner}
						</div>
					);
			} else {
				if (link['onClick']) {
					r = (<Link to={link.url} params={{id: link.params}} onClick={link['onClick']}>{inner}</Link>);
				} else {
						r = (<Link to={link.url} params={{id: link.params}}>{inner}</Link>);
				}
			}

			return (
				<div key={link.text + (link.params || '')} className='sidebar-link'>
					{r}
				</div>			
			);
		});
	},
	
	render: function() {
		return (
		<div>
			<div className='col-xs-2 col-md-2 sidebar'>
				<div className='sidebar-logo'>
					<span className='sidebar-link-text xfont-thin'>Item Builder</span>
				</div>
			
				{this.renderLinks()}
			</div>

			<div className='col-xs-9 col-md-9 col-xs-offset-1 col-md-offset-1 content'>
				<RouteHandler apiVersion={this.state.apiVersion} />
			</div>

		</div>
		);
	}

});


var routes = (
	<Route name='app' path='/' handler={App}>
		<Route name='create' handler={Create} />
		<Route name='view' path="view/:id" handler={View} />
		<Route name='edit' path="edit/:id" handler={Create} />
		<DefaultRoute handler={Create} />
	</Route>
);

Router.run(routes, Router.HistoryLocation, function(Handler) {
	React.render(<Handler />, document.getElementById('app'));
});

export default App;