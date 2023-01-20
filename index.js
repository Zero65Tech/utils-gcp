exports.init = (config) => {

  if(config.firestore) {
    exports.Firestore : require('./src/firestore.js');
  }

}