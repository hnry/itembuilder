var fs = require('fs');
var browserify = require('browserify');
var uglify = require('uglify-js');
var babelify = require('babelify');
var watchify = require('watchify');
var path = require('path');

function transform(inputPath, outputPath) {
	function writeFile(bundle) {
		bundle.bundle().on('error', function(err) {
			console.log(err.toString());
		});
		
		var writeStream = fs.createWriteStream(outputPath);
		bundle.bundle().pipe(writeStream);
	}

	var bundle = watchify(browserify(inputPath, { verbose: true, debug: true })).transform(babelify);
	
	writeFile(bundle);

	bundle.on('update', function(filepath) {
		console.log('updating...', filepath)
		writeFile(bundle);
	});

	bundle.on('log', console.error);
}

transform(__dirname + '/src/app.js', __dirname + '/public_html/app.js');
//transform('./app/lib/items.js', './public_html/items.js');
