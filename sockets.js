var app = module.parent.exports.app
  , io = require('socket.io')
  //, handle = require("./handle")
  , handle = module.parent.exports.handle

// sockets 
var sock = io.listen(app)
sock.sockets.on("connection", function(client){
  //console.log("websocket connection client:", client)
  client.on("message", function(msg){
	console.log("websocket client msg:", msg)
    handle.incomingMsg(msg, client)
  })
  client.on("disconnect", function(){
    handle.disconnect(client)
  })
})

sock.on("message", function(msg){
    console.log('get socket msg, not client msg:' + msg);
})

