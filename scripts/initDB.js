var riotApiKey = require('../settings.json').riotApiKey;
/*
	Initializes the database with champion data 
 */

var db = require('../lib/db');
db.db.sync({force: true});

var request = require('superagent');

var count = 0;
var savedCount = 0;

request
.get('https://global.api.pvp.net/api/lol/static-data/na/v1.2/champion?api_key=' + riotApiKey)
.set('Accept', 'application/json')
.end(function(err, res) {
	// response is { type: 'champion', version: ..., data: [champ names] }
	
	Object.keys(res.body.data).forEach(function(champ) {
		// { id, key, name, title }
		champ = res.body.data[champ];
		count += 1;

		db.Champion.create({
			riotId: champ.id,
			name: champ.name,
			riotKey: champ.key,
			title: champ.title
		}).then(function() {
			savedCount += 1;
			if (savedCount === count) {
				console.log('\n\nProcessed', savedCount, '/', count, 'champions');
			}
		});
	});
});
