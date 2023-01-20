exports.init = (config) => {

  if(config.firestore) {
    exports.Firestore = {};
    let Firestore = new (require('@google-cloud/firestore').Firestore)();
    for(let collection of config.firestore.collections)
      exports.Firestore[collection] = Firestore.collection(collection);
  }

  delete exports.init;

}