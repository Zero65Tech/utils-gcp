exports.init = (config) => {


  if(config.firestore) {

    const firestore = require('@google-cloud/firestore');
    exports.Firestore = {
      FieldValue: firestore.FieldValue
    };

    let Firestore = new firestore.Firestore();
    for(let collection of config.firestore.collections)
      exports.Firestore[collection] = Firestore.collection(collection);

  }


  if(config.service) {

    const axios = require('axios');
    const https = require('https');

    exports.Service = {};

    let doGet = async (path, baseURL, params, headers) => {
      let ret = await axios.get(path, {
        baseURL: baseURL,
        headers: headers,
        params: params,
        httpsAgent: new https.Agent({ keepAlive: true, maxSockets: Infinity }),
      });
      return ret.data;
    }

    Object.entries(config.service).forEach(entry => {

      let service = entry[0];
      let { baseURL, apis } = entry[1];

      exports.Service[service] = {};

      Object.entries(apis).forEach(entry => {

        let api = entry[0];
        let { method, path } = entry[1];

        if(method == 'GET')
          exports.Service[service][api] = async (params, headers) => await doGet(path, baseURL, params, headers);

      });

    });

  }


  delete exports.init;

}