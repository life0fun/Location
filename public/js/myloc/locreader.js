// create a tab reader for file.
function LocReader () {
	this.file = null;
	this.reader = null;
	this.data = null;
	this.cursor = 0;

	// every call to this func, create a closure over reader, 
	// assign it as onload callback, 
	this.loadFile = function(file, reader){
		var that = this;
		that.file = file;
		console.log('closed over file:',that.file);

		var ret = function(e){
			that.reader = reader;
			that.data = reader.result;
			console.log("loading file done.", that.file);

			$(document).trigger('ev_dataready');
		};
		return ret;
	};

	this.getData = function() {
		return this.data; 
	};

	this.logData = function() {
		console.log('getting data:', this.data);
		return this.data;  // lines is already public variable!!!
	};
};
