var db = require('../lib/db');
var env = process.env.NODE_ENV || 'development';

var partials = {partials: {header: '_header', footer: '_footer'}};


exports.index = function(req, res) {
  // pull champion data and render in script tag
  db.Champion.findAll().then(function(champions) {
    partials.champions = champions.map(function(champ) {
      return { riotId: champ.riotId, name: champ.name, title: champ.title, riotKey: champ.riotKey };
    });

    if (env === 'production') partials.production = true;
    res.render('index', partials);
  });	
}


exports.apiView = function(req, res) {
	db.ItemSet.findOne({where: { id: req.params.id } }).then(function(itemset) {
		db.Champion.findOne({ where: {riotId: itemset.champion_id}}).then(function(champion) {
			var data = {
				id: itemset.id,
				champion: champion,
				itemset: itemset.itemset
			};
			res.send({ status: 'ok', data: data });
		}).catch(function(err) {
			res.send({ status: err });
		});
	}).catch(function(err) {
		res.send({ status: err });
	});
}

/*
	saving existing and creating end point
 */
exports.apiCreate = function(req, res) {
	// separate our data from league item set data
	var appData = { id: req.body.id, championId: req.body.champion.riotId, description: req.body.description };
	delete req.body.champion;
	delete req.body.id;
	delete req.body.description;

	db.ItemSet.create({itemset: req.body.itemset, champion_id: appData.championId, description: appData.description }).then(function(itemset) {
			res.send({ status: 'ok', id: itemset.id });
	}).catch(function(err) {
			res.send({ status: err });
	});
}
