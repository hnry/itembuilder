var settings = require('../settings.json');
var Seq = require('sequelize');

var seq = new Seq(settings.db_name, settings.db_user, settings.db_password, {
	host: settings.db_hostname,
	dialect: 'postgres',
	pool: {
		max: 5,
		min: 1,
		idle: 10000
	}
});

exports.db = seq;

exports.Champion = seq.define('champion', {
	riotId: { type: Seq.INTEGER, allowNull: false, unique: true, primaryKey: true },
	name: { type: Seq.STRING, allowNull: false },
	riotKey: { type: Seq.STRING, allowNull: false },
	title: { type: Seq.STRING, allowNull: false }
});


exports.ItemSet = seq.define('itemset', {
	id: {  type: Seq.UUID, primaryKey: true, unique: true, defaultValue: Seq.UUIDV4 },
	champion_id: { type: Seq.INTEGER, allowNull: false },
	itemset: { type: Seq.JSONB }
});

seq.sync();
