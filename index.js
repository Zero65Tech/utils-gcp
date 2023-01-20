exports.init = (config) => {

  if(config.firestore) {

    let firestore = require('@google-cloud/firestore');
    exports.Firestore = {
      FieldValue: firestore.FieldValue
    };

    let Firestore = new firestore.Firestore();
    for(let collection of config.firestore.collections)
      exports.Firestore[collection] = Firestore.collection(collection);

  }

  delete exports.init;

}