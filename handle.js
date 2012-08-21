//require.paths.unshift(
//	__dirname
//)

var PlaybackClient = require('./PlaybackClient').PlaybackClient;
var TweetClient = require('./TweetClient').TweetClient;
var RealtimeClient = require('./RealtimeClient').RealtimeClient;
var GoogleLocJson = require('./GoogleLocJson').GoogleLocJson;

// module private data is closure
var playbackclients = []
var tweetclients = []
var realtimeclients = []
var allClients = {}

// closure streaming service mother
var TweetServiceMother = null;

module.exports = {
  websockClient : function(client){
	console.log("handle websockClient:", client);
	track = new Track(client);
	playbackClients.push(trackclient);
  }
, incomingMsg: function(msg, client){
    console.log("recvd websocket msg: " + msg)
    msg = msg || "noop"
    console.dir(msg)
    switch(msg){
      case "playbackclientjoin":
        console.log("playback client connected....standalone client:"+client.sessionId);
		new PlaybackClient(client);
        break;
      case "realtimeclientjoin":
		console.log("realtime client want to join the party")
		addClient(new RealtimeClient(client));
        break;
      case "tweetclientjoin":
        console.log("tweet client recver only...start streaming:"+client.sessionId); 
        if(TweetServiceMother == null){
            TweetServiceMother = new TweetClient();
            TweetServiceMother.add(client);
            TweetServiceMother.startStreaming();
        }else{
            TweetServiceMother.add(client);
        }
        break;
      case "resolvewifiloc":
        console.log('Resolving Wifi Locations:');
        new GoogleLocJson(client);
        break;
      case "watch":
        console.log("client requests to watch a game")
        break;
    }
  }
, processPostedFix: function(lat,lng){
	console.log('handle process posted fix:', lat, lng);
	for(var k in allClients){
		allClients[k].sendLocation(lat,lng);
	}
  }

, disconnect: function(client){
    console.log("handle : disconnected client " + client.sessionId);
	delete allClients[client.sessionId];
  }
}

function addClient(trackclient){
	console.log("handle adding client" + trackclient);
	allClients[trackclient.sessionId] = trackclient;
	
	//
	// handle msg emits from underlying track client.
	// websock msg handle by track client...emits to upper layer if needed.
	//
	//trackclient.on('event', this.notify.bind(this));
	//trackclient.on('event', notifyAll(this));
	trackclient.on('message', function(msg){
		console.log('message recv from client:'+msg);
		console.log('message recd from client:'+client);
	})
	trackclient.on('end', function(client){
      console.log("end emitted")
	})
}
