var fs			= require('fs')
   ,sys         = require('sys')
   ,path        = require('path')
   ,net			= require('net')
   ,LineReader  = require('./lib/FileLineReader').FileLineReader
   ,EventEmitter = require('events').EventEmitter

// Constructor, one client for each remote connection.
// no need to coordinate between clients. They are non-related.
var PlaybackClient = module.exports.PlaybackClient = function(client){
    this.logfiles = [];
    this.streamfile = null;

    client.removeAllListeners("message");
    client.on("message", this.handleMsg.bind(this));
    client.on("disconnect", this.quit.bind(this));
	client.on("end", this.quit.bind(this));
    //cookies = cookieParser(client.request.headers.cookie);

    this.client = client;

    // var self = this;
    // self.client, self.logfiles
    var cbAllTracks = function(logfiles, client){ // scoping callback closure!
        return function(filename){
            console.log('trackfile:'+filename);
            logfiles.push(filename);
            client.send(JSON.stringify({'method':'trackfiles', 'file':filename}));
        }
    }(this.logfiles, this.client);
    this.availableTracks(cbAllTracks);
};

// Prototype Inheritance
sys.inherits(PlaybackClient, EventEmitter)

PlaybackClient.prototype.availableTracks = function(callback) {
	var files = fs.readdirSync(path.join(__dirname, 'tracklogs'));
	for(var i=0;i<files.length;i++){
		var file = files[i];
		//console.log('track file:' + file);
		//callback(path.join(__dirname, 'tracklogs', file));
		callback(file);
	}
}

PlaybackClient.prototype.allTracks = function(callback) {
	this.availableTracks(function(trackfilepath){
		var flr = new LineReader(trackfilepath);
		while((line = flr.currentLine()) != null){
			console.log('===> '+line);
			callback(line);
			flr.moveToNextLine();
		}
	});
}

PlaybackClient.prototype.getEvents = function(callback) {
    var flr = new LineReader(this.streamfile);
    while((line = flr.currentLine()) != null){
        console.log('===> '+line);
		callback(line);
		flr.moveToNextLine();
    }
}

PlaybackClient.prototype.quit = function(){
    console.log('client disconnected...'+this.client);
    if(this.timerhandler){
        console.log('clear interval upon disconnect...');
        clearInterval(this.timerhandler);
        this.timerhandler = null;
    }

    if(this.daemon){
        console.log('kill daemon status');
        this.daemon.kill();
        this.daemon = null;
    }
}

// this is to handle single event from one client.
// if you want broadcast this event to all client, emit this events, handle it in upper layer!!!
PlaybackClient.prototype.handleMsg = function(message){
    event = JSON.parse(message);
    console.log(message);
    switch(event.method){
        case "playbackstreaming":
            console.log("track handle streaming file:"+event.file);
            this.streamingFile(event.file);
            break;
        case "broadcast":
            console.log("track handle broadcast");
            //this.emit("event", event, this);
            break;
        default:
            console.log('Unknown handleMsg:'+message);
            break;
    }
}

PlaybackClient.prototype.streamingFile = function(filename){
	var self = this;
    var i = 1;
    this.streamfile = path.join(__dirname, 'tracklogs', filename);

	this.getEvents(function(line){
        var jsonobj = JSON.parse(line, function(key,val){
            console.log(key+'=>'+val);
        })
        // after callback of parse, the object is lost, need to re-construct!
        var jsonobj = JSON.parse(line);

        var cbTimeout = function(obj){
            return function(){
                console.log('sending:'+JSON.stringify(obj));
                self.client.send(JSON.stringify({'method':'marker', 'data':JSON.stringify(obj)}));
            }
        }(jsonobj);
        console.log('current index:'+i);
        setTimeout(cbTimeout, (i++)*2000);
	});

    /*
	// to stream, send one by one thru timeout callback!
	for(var i=0;i<self.locations.length;i++){
		try{
			var tmout_cb = function(idx){
				return function(){
					self.client.send(JSON.stringify(self.locations[idx]));
				};
			}(i);
			setTimeout(tmout_cb, i*1000);
		}
		catch(e){
			console.log('web socket error');
		}
	}
    */
}

PlaybackClient.prototype.formatStatusData = function(data){
	var datastr = data.toString('ascii');
	console.log(datastr);
	if(typeof(data) !== 'string'){
		for(var k in data){
			//console.log(k + ':'+data[k]);
		}
	}

	var arr = datastr.split(',');
	var o = {};
	for(var id in arr){
		o[arr[id].split(':')[0]] = arr[id].split(':')[1];
	}
	console.log(o);
	return JSON.stringify(o);
}

exports.PlaybackClient = PlaybackClient;
