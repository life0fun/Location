
require.paths.unshift(
	,__dirname
)

var fs			= require('fs')
   ,sys         = require('sys')
   ,path        = require('path')
   ,net			= require('net')
   ,LineReader  = require('./lib/FileLineReader').FileLineReader
   ,EventEmitter = require('events').EventEmitter
   ,TwitterRestNode = require('./TwitterRestNode').TwitterRestNode
   ,DroidTweetNode  = require('./DroidTweetNode').DroidTweetNode

// Constructor
var Track = module.exports.Track = function(client){
	this.clients = [];
	this.locations = [];
    this.logfiles = [];
    this.streamfile = null;
    this.daemon = null;
    this.timerhandler = null;

    client.removeAllListeners("message");
    client.on("message", this.handleMsg.bind(this)); // bind(obj), set func scope to obj
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
sys.inherits(Track, EventEmitter)

Track.prototype.availableTracks = function(callback) {
	var files = fs.readdirSync(path.join(__dirname, 'tracklogs'));
	for(var i=0;i<files.length;i++){
		var file = files[i];
		//console.log('track file:' + file);
		//callback(path.join(__dirname, 'tracklogs', file));
		callback(file);
	}
}

Track.prototype.allTracks = function(callback) {
	this.availableTracks(function(trackfilepath){
		var flr = new LineReader(trackfilepath);
		while((line = flr.currentLine()) != null){
			console.log('===> '+line);
			callback(line);
			flr.moveToNextLine();
		}
	});
}

Track.prototype.getEvents = function(callback) {
    var flr = new LineReader(this.streamfile);
    while((line = flr.currentLine()) != null){
        console.log('===> '+line);
		callback(line);
		flr.moveToNextLine();
    }
}

Track.prototype.quit = function(){
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
Track.prototype.handleMsg = function(message){
    event = JSON.parse(message);
    console.log(message);
    switch(event.method){
        case "playbackstreaming":
            console.log("track handle streaming file:"+event.file);
            this.streamingFile(event.file);
            break;
		case "realtimestreaming":
			console.log("start real time streaming with interval:"+event.interval);
			this.streamingTwitter(event.interval);
			//this.streamingFacebook(event.interval);
			break;
		case "twitterstreaming":
			console.log("sart twitter monitor streaming");
			this.streamingTweet();
            break;
        case "broadcast":
            console.log("track handle broadcast");
            //this.emit("event", event, this);
            break;
        default:
            console.log('Unknown Track handleMsg:'+message);
            break;
    }
}

Track.prototype.streamingFile = function(filename){
	var self = this;
    var i = 1;
    this.streamfile = path.join(__dirname, 'tracklogs', filename);

	this.getEvents(function(line){
        var jsonobj = JSON.parse(line, function(key,val){
            console.log(key+'=>'+val);
        })
        // after callback of parse, the object is lost, need to re-construct!
        var jsonobj = JSON.parse(line);
		self.locations.push(jsonobj);

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

Track.prototype.streamingTwitter = function(interval){
	var self = this;
    var twit = new TwitterRestNode('locstream', 'locstream1');
    
    twit.on('twitLocation', function(data){
        console.log('streamingTwit data....'+data);
        var socket = self.client;
        sys.log('----socket---:'+socket+'\n');
        sys.log(data);
		var formatdata = self.formatStatusData(data);
		socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
    });

	var cbTimeout = function(twitnode){
		return function(){
            sys.log('timer expired...twit is:'+ twitnode);
            twitnode.RestApi()
        }
    }(twit)
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
}

Track.prototype.streamingFacebook = function(interval){
	var self = this;
	console.log('start streaming facebook every:'+interval);
	var fbpath = "/Users/e51141/macsrc/graph/facebook-pysdk/mysrc/"
	   ,fbfile = fbpath+"/fb_graph.py"
	   ,spawn = require('child_process').spawn;

	var cbTimeout = function(socket){
		return function(){
            this.daemon = spawn(fbfile, [], {cwd:fbpath}); 
            this.daemon.on('exit', function(code){
                sys.log('fbstat exit code:'+code);
				this.daemon.stdin.end();
                this.daemon = null;
            });
            
            this.daemon.stdout.on('data', function(data){
                sys.log('----socket---:'+socket+'\n');
                sys.log(data);
				var formatdata = self.formatStatusData(data);
				socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
				//console.log('sending:'+JSON.stringify(data));
            });
        }
    }(self.client);
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
}

Track.prototype.streamingTwitterPython = function(interval){
	var self = this;
	console.log('start streaming twitter every:'+interval);
	var twpath = "/Users/e51141/macsrc/graph/facebook-pysdk/mysrc/"
	   ,twfile = twpath+"/tw_userline.py"
	   ,spawn = require('child_process').spawn;

	var cbTimeout = function(socket){
		return function(){
            this.daemon = spawn(twfile, [], {cwd:twpath}); 
            this.daemon.on('exit', function(code){
                sys.log('twstat exit code:'+code);
				this.daemon.stdin.end();
                this.daemon = null;
            });
            
            this.daemon.stdout.on('data', function(data){
                sys.log('----socket---:'+socket+'\n');
                sys.log(data);
				var formatdata = self.formatStatusData(data);
				socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
				//console.log('sending:'+JSON.stringify(data));
            });
        }
    }(self.client);
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
}

// lauch twitter node and monitoring keywords
Track.prototype.streamingTweet = function(keywords){
	var self = this;
    var twit = new DroidTweetNode(self.client, 'Xoom Atrix');
    console.log('streamingTweet twit:'+twit + '..to client:'+self.client);
	twit.startStreaming();

	/**
	 * do not need periodical time, just streamng.
    twit.on('twitLocation', function(data){
        console.log('streamingTwit data....'+data);
        var socket = self.client;
        sys.log('----socket---:'+socket+'\n');
        sys.log(data);
		var formatdata = self.formatStatusData(data);
		socket.send(JSON.stringify({'method':'marker', 'data':formatdata}));
    });

	var cbTimeout = function(twitnode){
		return function(){
            sys.log('timer expired...twit is:'+ twitnode);
            twitnode.RestApi()
        }
    }(twit)
    this.timerhandler = setInterval(cbTimeout, 10*1000); // every min.
	*/
}

Track.prototype.formatStatusData = function(data){
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

exports.Track = Track;
