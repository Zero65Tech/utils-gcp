exports.init = async (config) => {


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

    let doGet = async (client, path, baseURL, params, req, res) => {

      let options = {
        baseURL: baseURL,
        params: params,
      };

      if(req && res) {
        if(req.headers['if-none-match'])
          options.headers['if-none-match'] = req.headers['if-none-match'];
        options.responseType = 'stream';
        options.validateStatus = status => true;
        let response = await client.get(path, options);
        response.data.pipe(res.status(response.status).set(response.headers));  
      } else {
        let response = await client.get(path, options);
        return response.data;
      }
  
    }

    // https://axios-http.com/docs/req_config
    // https://axios-http.com/docs/res_schema

    let axios = undefined;
    let auth = undefined;
    let targetClient = undefined;

    if(process.env.ENV == 'test') { // Development / Testing

      const fs = require('fs');
      axios = require('axios');
      let https = require('https');

      axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: Infinity });
      if(fs.existsSync(process.cwd() + '/.session'))
        axios.defaults.headers.common['Cookie'] = 'sessionId=' + JSON.parse(await fs.promises.readFile(process.cwd() + '/.session')).id;

    } else if(process.env.GOOGLE_SERVICE_ACCOUNT) { // Google Cloud Build

      axios = require('axios');
      let https = require('https');
      let { GoogleAuth, Impersonated } = require('google-auth-library');

      axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: Infinity });
      auth = new GoogleAuth();
      targetClient = new Impersonated({
        sourceClient: await auth.getClient(),
        targetPrincipal: process.env.GOOGLE_SERVICE_ACCOUNT,
        targetScopes: [],
        lifetime: 3600, // 1hr
      });

    } else { // Google Cloud Run

      let { GoogleAuth } = require('google-auth-library');

      auth = new GoogleAuth();

    }

    exports.Service = {};

    for(let service in config.service) {

      let { baseURL, apis } = config.service[service];

      let client = undefined;
      if(process.env.ENV == 'test') // Development / Testing
        client = axios;
      else if(process.env.GOOGLE_SERVICE_ACCOUNT) // Google Cloud Build
        client = axios.create({ headers: { 'Authorization': 'Bearer ' + await targetClient.fetchIdToken(baseURL) } });
      else // Google Cloud Run
        client = await auth.getIdTokenClient(baseURL);

      exports.Service[service] = {};

      for(let api in apis) {

        let { method, path } = apis[api];

        if(method == 'GET')
          exports.Service[service][api] = async (params, req, res) => await doGet(client, path, baseURL, params, req, res);

      }

    }

  }


  delete exports.init;

}