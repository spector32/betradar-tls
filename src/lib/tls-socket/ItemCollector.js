const stream = require("stream");

class ItemCollector extends stream.Transform {
  constructor() {
    super({ objectMode: true });

    this.__buffer = null;
    this.lastString = "";
  }

  _transform(chunk, encoding, callback) {
    const chunkString = chunk.toString();
    this.lastString = chunkString;
    if (chunkString.trim() === "<ct/>") {
      callback();
      return;
    }

    let str = "";
    if (
      this.__buffer &&
      !this.__buffer.trim().endsWith(">") &&
      chunkString.startsWith("<")
    ) {
      str = chunk.toString();
    } else {
      str = (this.__buffer || "") + chunk.toString();
    }

    if (str.trim().startsWith("<")) {
      if (str.trim().endsWith(">")) {
        if (/\r\n\r\n$/gim.test(str)) {
          const msgX2 = str.split("\r\n\r\n");
          for (const msX of msgX2) {
            if (msX.trim().startsWith("<") && msX.trim().endsWith(">")) {
              this.push(msX);
            }
          }
        } else {
          this.push(str);
        }
      } else {
        this.__buffer = str;
      }
    } else {
      this.__buffer = str;
    }
    callback();
    return;
  }

  _flush() {
    console.log("Flushing...");
    this.__buffer = null;
    console.log("Done");
  }
}

module.exports = ItemCollector;
