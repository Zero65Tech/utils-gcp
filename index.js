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

    // https://axios-http.com/docs/req_config
    // https://axios-http.com/docs/res_schema

    const axios = require('axios');

    const http = require('http');
    const https = require('https');

    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: Infinity });
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: Infinity });

    exports.Service = {};

    let doGet = async (path, baseURL, params, req, res) => {

      let token = (await axios.get(
        '/computeMetadata/v1/instance/service-accounts/default/identity',
        {
          baseURL: 'http://metadata.google.internal',
          headers: { 'Metadata-Flavor': 'Google' },
          params: { 'audience': baseURL },
          responseType: 'text',
          httpAgent: httpAgent,
        }
      )).data;

      let options = {
        baseURL: baseURL,
        headers: {},
        params: params,
        httpsAgent: httpsAgent,
      };

      if(req && res) {
        options.headers = req.headers;
        options.responseType = 'stream';
        options.validateStatus = status => true;
      }

      options.headers['Authorization'] = 'Bearer ' + token;

      let response = await axios.get(path, options);

      if(req && res)
        response.data.pipe(res.status(response.status).set(response.headers));
      else
        return response.data;

    }

    Object.entries(config.service).forEach(entry => {

      let service = entry[0];
      let { baseURL, apis } = entry[1];

      exports.Service[service] = {};

      Object.entries(apis).forEach(entry => {

        let api = entry[0];
        let { method, path } = entry[1];

        if(method == 'GET')
          exports.Service[service][api] = async (params, req, res) => await doGet(path, baseURL, params, req, res);

      });

    });

  }


  delete exports.init;

}