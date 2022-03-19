const res = require("express/lib/response");
const mongoose = require("mongoose");
const redis = require("redis");

const util = require("util");
const redisUrl = "redis://localhost:6379";
const client = redis.createClient(redisUrl);

client.hget = util.promisify(client.hget);

const originalExec = mongoose.Query.prototype.exec;

// client.flushall();

mongoose.Query.prototype.fromCache = function (options = {}) {
  this._cacheable = true;
  this._topLevelKey = options.key || "default";
  console.log("from cache", this._topLevelKey, options);
  return this;
};

mongoose.Query.prototype.exec = async function () {
  if (!this._cacheable) {
    return originalExec.apply(this, arguments);
  }
  const redisKey = JSON.stringify({
    ...this.getQuery(),
    collection: this.mongooseCollection.name,
  });

  const cacheValue = JSON.parse(await client.hget(this._topLevelKey, redisKey));
  console.log("redisKey", redisKey,this._topLevelKey, cacheValue ? Object.keys(cacheValue).length : "");

  if (cacheValue && Object.keys(cacheValue).length) {
  //  console.log("cacheValue", cacheValue);

    return Array.isArray(cacheValue)
      ? cacheValue.map((d) => new this.model(d))
      : new this.model(cacheValue);
  }

  // exec returns a mongoose model
  const result = await originalExec.apply(this, arguments);
  console.log("res ", result.length);
  client.hset(this._topLevelKey, redisKey, JSON.stringify(result));
  return result;
};

module.exports = {
  bustCache(key) {
    console.log("BUSTING", key);
    let strKey = JSON.stringify(key);
    client.flushall();
    async function  deleteKeyData() {

        try {
            const val = await client.get(strKey);
            console.log('getting ', val)
            // NOTE: deletion by key doesn't seem to be working
            // busting whole cache for now
          await client.del(strKey, async function(e, val){
              console.log('dele ?', e, val);
    
          });
          console.log("done");
        } catch (e) {
          console.log("e ", e);
        }
    }
   // deleteKeyData();
  },
};
