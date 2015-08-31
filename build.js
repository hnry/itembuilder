var fs = require('fs');

var paths = {
	css: ['./assets/style.less'],
	app_js: ['./src/app.js'],
	item_js: ['./src/items.js'],
	fluxy_js: [
		'./src/fluxy/dispatcher.js', 
		'./src/fluxy/actions.js',
		'./src/fluxy/itemsetStore.js',
		'./src/fluxy/appStore.js'
	]
}

var output_paths = {
	css: './public_html/style.css',
	app_js: './public_html/app.js',
	item_js: './public_html/items.js',
	fluxy_js: './public_html/fluxy.js'
}

var deploy = false;
if (process.argv[2] === 'deploy') {
	deploy = true;
}


var browserify = require('browserify');
var uglify = require('uglify-js');
var stream = require('stream');
var babelify = require('babelify');

var babel = require("babel");

function minifyreact(input, out) {
	var bify = browserify(input)
				  .transform(babelify)
					.bundle();
	var ws = new stream.Readable();
	var src = '';
	ws._read = function() {}
	ws.write = function(chunk) {
		src += chunk.toString();
	}
	ws.end = function() {
		var minified = uglify.minify(src, { fromString : true });
		fs.writeFile(out, minified.code, function(err) {
			if (err) throw err;
			console.log(input[0], 'build complete.')
		});
	}
	bify.pipe(ws);
}

function minify(input, output) {
	var code = '';

	input.forEach(function(filepath) {
		var result = babel.transformFileSync(filepath);
		code += '\n' + result.code;
	});

	var minified = uglify.minify(code, { fromString : true });
	fs.writeFile(output, minified.code, function(err) {
			if (err) throw err;
			console.log('js complete.');
	});
}

////////////////////
if (deploy) {
	console.log('building for deployment...');
	minifyreact(paths.app_js, output_paths.app_js);
	var arr = paths.item_js.concat(paths.fluxy_js);
	minify(arr, output_paths.fluxy_js);
} else {
	minify(paths.item_js, output_paths.item_js);
	minify(paths.fluxy_js, output_paths.fluxy_js);
}

//	css
//	
var less = require('less');
fs.readFile(paths.css[0], function(err, data) {
	if (err) throw err;
	less.render(data.toString(), { 
			sourceMap: {}, 
			compress: true
		 }, 
		function(err, output) {
			if (err) throw err;
			//output.map
			fs.writeFile(output_paths.css, output.css, function(err) {
				if (err) throw err;
				console.log('css build complete.');
			});
	});
});
///////////////////
