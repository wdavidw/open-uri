var mime = require("mime")
  , open = require("./open-uri");

/**
* Helper for buffering up a stream and passing its content to a callback.
* 
* @param {String} type              The mime type of the stream.
* @param {String} path              The path to lookup the type from in case it's not available.
* @param {ReadableStream} stream    A ReadableStream to buffer from.
* @param {Function} output          Callback which is called whenever the buffering is completed or if there was an error.
* 
*/
exports.buffer = function buffer(type,path,stream,output){
  // Fix the type if it comes from a HTTP header
  type = (type||'').split(";")[0];
  type = mime.lookup(type||path||'')
  var buf = [], len = 0;
  stream.setEncoding(mime.charsets.lookup(type))
  stream.on("error",function(err){ error(output, err) }) // TODO Close the stream on error?
  stream.on("timeout",function(){ error(output,new Error("[OpenURI] Connection timed out.")) }) // TODO Close the stream on timeout?
  stream.on("data",function(chunk){ buf.push(chunk); len += chunk.len; })
  stream.on("end",function(){ output(null,parse(type,buf,len),stream) })
}

/**
* Helper for parsing the content based on mime-type. Ex. parsing a JSON string to an object, text based content to a string and binary as a buffer.
* 
* @param {String} type              The mime-type.
* @param {Array<Buffer>} buf        An array of Buffer objects.
* @param {Integer} len              The total size of the buffers.
*/
function parse(type,buf,len){
  for( key in parse )
    if( ~type.indexOf(key) )
      return parse[key](buf,len);
  return parse.default(buf,len);
}
parse["text/"] = function(buf,len){ return buf.join("") }
parse["application/json"] = function(buf,len){ return JSON.parse(buf.join("")) }
parse.default = 
parse["application/octet-stream"] = function(buf,len){ 
  var body = new Buffer(len), offset = 0;
  buf.forEach(function(b){b.write(body,offset); offset += b.length})
  return body
}
exports.parse = parse;

function error(output,err){
  if( typeof output == "function" )
    output(err);
  else 
    throw( err );
  return open;
}
exports.error = error;

exports.toBase64 = function toBase64(str){ 
  return (new Buffer(str||"", "ascii")).toString("base64") 
}

exports.isValidOutput = function isValidOutput(output){
  return typeof output == "function" || ( typeof output == "object" && output.writable )
}