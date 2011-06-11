var http = require('http');

var figures = [
	[[1,1],
	 [1,1]],
	[[0,1,0],
	 [0,1,0],
	 [0,1,1]],
	[[0,1,0],
	 [0,1,0],
	 [1,1,0]],
	[[0,0,0],
	 [0,1,1],
	 [1,1,0]],
	[[0,0,0],
	 [1,1,0],
	 [0,1,1]],
	[[0,0,0],
	 [1,1,1],
	 [0,1,0]],
	[[0,0,0,0,0],
	 [0,0,1,0,0],
	 [0,0,1,0,0],
	 [0,0,1,0,0],
	 [0,0,1,0,0]]
];


var rotate = function(fig,times) {
	if (!times) {
		return fig;
	}

	var tmp = [];
	for (var x = fig.length - 1; x >= 0; x--) {
		var line = [];
		for (var y = 0; y < fig[x].length; y++) {
			line.push(fig[y][x]);
		}
		tmp.push(line);
	}

	return rotate(tmp, times - 1);
};


var game = function(code) {
	code = Array.isArray(code) ? code : code.split(',');

	var that = {};
	var lvl = level(code[0]);
	var paused = parseInt(code[5],10);
	var speedy = parseInt(code[6],10);
	
	var figure = {
		id:parseInt(code[1],10),
		x:parseInt(code[2],10),
		y:parseInt(code[3],10),
		rotation:parseInt(code[4],10)
	};
	var fig = rotate(figures[figure.id], figure.rotation);
	
	var clash = function(x,y) {
		for (var i = 0; i < fig.length; i++) {
			for (var j = 0; j < fig[i].length; j++) {
				if (lvl.get(i+x,j+y) && fig[i][j]) {
					return true;
				}
			}
		}
		return false;
	};
	var blit = function() {
		for (var i = 0; i < fig.length; i++) {
			for (var j = 0; j < fig[i].length; j++) {
				if (fig[i][j]) {
					lvl.set(i+figure.x,j+figure.y,true);
				}
			}
		}		
	}
		
	that.animate = function() {
		if (paused) {
			return that;
		}
		if (clash(figure.x,figure.y+1)) {
			blit();
			figure.id = (Math.random() * figures.length) | 0;
			figure.x = (8 - figures[figure.id].length) >> 1;
			figure.y = -figures[figure.id].length;
			figure.rotation = 0;
			speedy = 0;
			lvl.removeFullLines(); // TODO: implement points
		} else {
			figure.y++;
		}
		return that;
	};

	that.pauseResume = function() {
		paused = 1 - paused;
		return that;
	};

	that.move = function(deltaX) {
		if (!clash(figure.x + deltaX, figure.y)) {
			figure.x += deltaX;
		}
		return that;
	};

	that.rotate = function() {
		var tmp = fig;
		fig = rotate(fig, 1);
		if (clash(figure.x, figure.y)) {
			fig = tmp;
		} else {
			figure.rotation = (figure.rotation + 1) % 4;
		}
		return that;
	};

	that.speedup = function() {
		speedy = 1;
		return that;
	};

	that.stringify = function() {
		return lvl.stringify() + ',' + figure.id + ',' + figure.x + ',' + figure.y + ',' + figure.rotation + ',' + paused + ',' + speedy;
	};
	
	that.htmlify = function() {
		blit();
		
		return lvl.htmlify(
			paused,
			speedy,
			game(code).animate().stringify(),
			game(code).pauseResume().stringify(),
			game(code).move(-1).stringify(),
			game(code).move( 1).stringify(),
			game(code).rotate().stringify(),
			game(code).speedup().stringify()
		);
	}
	
	return that;
};

function level(code) {
	var lev;
	if (code.match( /^[a-z0-9+\/]{24}$/i )) {
		lev = new Buffer(code, 'base64');
	} else {
		lev = new Buffer(new Array(18));
	}
	var that = {
		removeFullLines: function() {
			var tmp = new Buffer(18);
			var tmpY = 17;
			var count = 0;
			for (var y = 17; y >= 0; y--) {
				if (lev[y] === 255) {
					count++;
				} else {
					tmp[tmpY--] = lev[y];
				}
			}
			for (; tmpY >= 0; tmpY--) {
				tmp[tmpY] = 0;
			}
			lev = tmp;
			return count;
		},
		get: function(x, y) {
			if (x < 0 || x >= 8 || y < 0 || y >= 18) {
				return (x < 0 || x >=8 || y >= 18);
			}
			return 0 !== (lev[y] & (1 << x));
		},
		set: function(x, y, on) {
			if (x < 0 || x >= 8 || y < 0 || y >= 18) {
				return;
			}
			if (on) {
				lev[y] |= 1 << x;
			} else {
				lev[y] &= ~(1 << x);
			}
		},
		stringify: function() {
			return lev.toString('base64');
		},
		htmlify: function(paused, speedy, next, pause_resume_game, left_game, right_game, rotate_game, speedup_game) {
			var html = '<html><head><title>html-tetris</title>';
			html += paused ? '' : '<meta http-equiv="refresh" content="' + (speedy ? '0.04' : '0.2') + '; url=/'+next+'">';
			html += '</head><body style="font-family:monospace;"><pre style="font-size: 25px; line-height: 20px; border: 2px solid #000; float: left;">';
			for (var y = 0; y < 18; y++) {
				for (var x = 0; x < 8; x++) {
					html += that.get(x, y) ? '\u2588' : '\u00A0';
				}
				html += '\n';
			}
			html += '</pre>';
			html += '<br style="clear:both;">'
			html += '<p>';
			html += '<a href="/' + left_game   + '" accesskey="Z">Left (Z)</a> ';
			html += '<a href="/' + right_game  + '" accesskey="X">Right (X)</a> ';
			html += '<a href="/' + rotate_game + '" accesskey="C">Rotate (C)</a> ';
			html += '<a href="/' + speedup_game + '" accesskey="V">Speedup (V)</a> ';
			html += '</p>';
			html += '<p><a href="/' + pause_resume_game + '" accesskey="P">Pause/Resume (P)</a></p>';
			html += '<p><a href="/" accesskey="R">Reset (R)</a></p>';
			html += '</body></html>\n';
			return html;
		}
	};
	return that;
}

http.createServer(function(request, response) {
	if (request.url === '/favicon.ico') {
		response.writeHead(404);
		response.end();
		return;
	}
	
	var g = game(request.url.substring(1) || ',0,2,-4,0,0,0');
		
	response.writeHead(200, {
		'content-type': 'text/html; charset=UTF-8'
	});
	response.end(g.htmlify());
}).listen(process.argv[2] || 12000);

process.on('uncaughtException', function(err) {
	console.error(err.stack);
});
