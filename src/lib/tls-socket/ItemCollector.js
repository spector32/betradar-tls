const stream = require("stream");

class ItemCollector extends stream.Transform {
  constructor() {
    super({ objectMode: true });

    this.__buffer = null;
    this.__chunkSize = 0;
  }

  __collectToBuffer(chunk) {
    const chunkBuffer = Buffer.from(chunk);
    this.__buffer = !this.__buffer
      ? chunkBuffer
      : Buffer.concat(
          [this.__buffer, chunkBuffer],
          this.__buffer.length + chunk.length
        );
  }

  _transform(chunk, encoding, callback) {
    const str = chunk.toString();
    if (/\r\n\r\n$/gim.test(str)) {
      this.__collectToBuffer(chunk);
      const cleanChunk = this.__buffer
        .toString()
        .replace(/[\r\n\t]/gm, "")
        .replace(/>\s*/g, ">")
        .replace(/\s*</g, "<");
      callback(null, cleanChunk);
      this.__buffer = null;
      this.__chunkSize = 0;
    } else {
      this.__collectToBuffer(chunk);
      callback(null);
    }
  }

  _flush() {
    console.log("Flushing...");
    this.__buffer = null;
    this.__chunkSize = 0;
    console.log("Done");
  }
}

module.exports = ItemCollector;
