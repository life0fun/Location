//
// Node.js Line Reader
// 
// usage: node LineReader.js file
// simple form could be:
//    require('fs').readFileSync('abc.txt').toString().split('\n').
//					forEach(function (line) { line; }) 
// 
// Haijin Yan, 2010
//
var fs = require('fs'),
	sys = require('sys'),
	fspath = require('path'),
	Buffer = require('buffer').Buffer;

// Constructor, put private, priviledge here.
var FileLineReader = function(filename, bufsize) {
	if(!bufsize){
		bufsize = 8*1024;
	}

	var self = this;  // inner funcs do not have access to this!
	var pos = 0;
	var buf = new Buffer(bufsize);
	var fd = fs.openSync(filename, "r");

	// public
	this.bufstr = "";
	this.lines = []
	this.curline = 0;

	// private
	var fillBuffer = function(){
		var nread = fs.readSync(fd, buf, 0, bufsize, pos);
		if(nread == 0)
			return -1;
		pos += nread;
		buf.length = nread;  // set the length 
		bufstr = buf.toString('ascii');
		return pos;  // ret the file off
	}

	// priviledge 
	this.getCurrentLine = function() {
		var self = this;

		if(self.lines.length == 0 || self.curline == self.lines.length-1){
			if(self.lines.length != 0){
				lastlinesize = self.lines[self.curline].length;
				if(lastlinesize != 0){
					pos -= lastlinesize;
				}
			}
			if(fillBuffer() > 0){
				self.lines = bufstr.split('\n');
				self.curline = 0;
				return self.lines[self.curline];
			}else{
				return null;
			}
		}else{
			return self.lines[self.curline];
		}
	}

	this.writeCurrentLine = function() {
		var wfd = fs.openSync(filename+'.out', 'w');
		var self = this;
		fs.writeSync(wfd, self.lines[self.curline]);
		fs.writeSync(wfd, '\n');
	}
}

FileLineReader.prototype.currentLine = function() {
	var self = this;
	var line = self.getCurrentLine();
	return line;
}

FileLineReader.prototype.moveToNextLine = function() {
	var self = this;
	self.curline++;
}

FileLineReader.prototype.unitTest = function() {
	while((line = this.currentLine()) != null){
		console.log(line);
		this.writeCurrentLine();
		this.moveToNextLine();
	}
}


// set me as one of the property obj of exports object
exports.FileLineReader = FileLineReader;
	
//sys.log(__dirname)
//sys.log(process.argv[2])

//var flr = new FileLineReader(process.argv[2]);
//flr.unitTest();
